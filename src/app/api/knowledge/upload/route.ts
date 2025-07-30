import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/utils/supabase/server'
import { createServiceRoleClient } from '@/utils/supabase/service-role'

export async function POST(request: NextRequest) {
  const isDevelopment = process.env.NODE_ENV === 'development'
  
  try {
    // Use regular client for auth check
    const authClient = await createClient()
    
    // Use service role client for database operations
    const supabase = createServiceRoleClient()

    // Check authentication using the auth client
    const { data: { user }, error: authError } = await authClient.auth.getUser()
    if (authError || !user) {
      console.error('Auth error:', authError)
      return NextResponse.json({ 
        error: 'Unauthorized',
        details: isDevelopment ? authError?.message : undefined 
      }, { status: 401 })
    }

    // Get form data
    const formData = await request.formData()
    const file = formData.get('file') as File
    const agentId = formData.get('agentId') as string
    const category = formData.get('category') as string
    const metadata = formData.get('metadata') as string

    if (!file || !agentId) {
      return NextResponse.json(
        { error: 'File and agentId are required' },
        { status: 400 }
      )
    }

    // Validate file size (50MB limit as per Supabase settings)
    const MAX_FILE_SIZE = 50 * 1024 * 1024; // 50MB in bytes
    if (file.size > MAX_FILE_SIZE) {
      return NextResponse.json(
        { error: 'File too large. Maximum size is 50MB' },
        { status: 400 }
      )
    }

    // Validate file type (including common markdown MIME types)
    const allowedTypes = [
      'text/plain', 
      'text/markdown', 
      'text/x-markdown',
      'application/x-markdown',
      'application/pdf', 
      'text/html'
    ]
    
    // Log file details for debugging
    console.log('File upload attempt:', {
      name: file.name,
      type: file.type,
      size: file.size,
      sizeInMB: (file.size / (1024 * 1024)).toFixed(2) + 'MB'
    })
    
    // Check file extension if MIME type is empty or generic
    const fileExtension = file.name.split('.').pop()?.toLowerCase()
    const isMarkdownFile = fileExtension === 'md' || fileExtension === 'markdown'
    
    if (!allowedTypes.includes(file.type) && !isMarkdownFile) {
      return NextResponse.json(
        { error: `Invalid file type: ${file.type}. Allowed: txt, md, pdf, html` },
        { status: 400 }
      )
    }

    // Get or create knowledge base for agent
    const { data: knowledgeBase, error: kbError } = await supabase
      .from('agent_knowledge_bases')
      .select('id')
      .eq('agent_id', agentId)
      .single()

    if (kbError && kbError.code !== 'PGRST116') {
      // PGRST116 is "no rows returned", which is expected if KB doesn't exist
      console.error('KB lookup error:', {
        error: kbError,
        message: kbError.message,
        code: kbError.code
      })
    }

    if (!knowledgeBase) {
      // Create knowledge base if it doesn't exist
      const { data: newKb, error: createError } = await supabase
        .from('agent_knowledge_bases')
        .insert({
          agent_id: agentId,
          name: 'Maya Coaching Knowledge Base',
          description: 'Knowledge base for Maya AI coach',
          document_count: 0,
          total_chunks: 0,
          indexing_status: 'pending'
        })
        .select()
        .single()
      
      if (createError) {
        console.error('KB creation error:', {
          error: createError,
          message: createError.message,
          details: createError.details,
          hint: createError.hint,
          code: createError.code
        })
        return NextResponse.json(
          { error: `Failed to create knowledge base: ${createError.message}` },
          { status: 500 }
        )
      }
      
      knowledgeBase = newKb
    }

    // Upload file to Supabase Storage
    const fileName = `${Date.now()}-${file.name}`
    const filePath = `knowledge/${agentId}/${fileName}`
    
    // First check if bucket exists
    const { data: buckets } = await supabase.storage.listBuckets()
    const bucketExists = buckets?.some(b => b.name === 'documents')
    
    if (!bucketExists) {
      // Create bucket if it doesn't exist
      const { error: bucketError } = await supabase.storage.createBucket('documents', {
        public: false,
        allowedMimeTypes: ['text/plain', 'text/markdown', 'application/pdf', 'text/html']
      })
      
      if (bucketError) {
        console.error('Bucket creation error:', bucketError)
        return NextResponse.json(
          { error: 'Failed to create storage bucket' },
          { status: 500 }
        )
      }
    }
    
    const { error: uploadError } = await supabase.storage
      .from('documents')
      .upload(filePath, file)

    if (uploadError) {
      console.error('Upload error:', uploadError)
      return NextResponse.json(
        { error: `Failed to upload file: ${uploadError.message}` },
        { status: 500 }
      )
    }

    // Get file content for processing
    let content = ''
    if (file.type === 'text/plain' || file.type === 'text/markdown') {
      content = await file.text()
    } else {
      // For PDF and HTML, we'll need to extract text
      // This is a placeholder - in production, use a library like pdf-parse
      content = `Content from ${file.name} - processing required`
    }

    // Create knowledge document record
    const { data: document, error: docError } = await supabase
      .from('knowledge_documents')
      .insert({
        knowledge_base_id: knowledgeBase.id,
        title: file.name,
        content: content,
        document_type: file.type === 'text/plain' ? 'text' : 
                       file.type === 'text/markdown' ? 'markdown' :
                       file.type === 'application/pdf' ? 'pdf' : 'html',
        source_url: filePath,
        content_hash: `${file.name}-${Date.now()}`, // Simple hash for now
        metadata: metadata ? JSON.parse(metadata) : {},
        chunk_count: 0 // Initialize chunk count
      })
      .select()
      .single()

    if (docError) {
      console.error('Document creation error:', {
        error: docError,
        message: docError.message,
        details: docError.details,
        hint: docError.hint,
        code: docError.code
      })
      return NextResponse.json(
        { error: `Failed to create document record: ${docError.message}` },
        { status: 500 }
      )
    }

    // If category provided, link it
    if (category && document) {
      const { data: categoryData } = await supabase
        .from('knowledge_categories')
        .select('id')
        .eq('knowledge_base_id', knowledgeBase.id)
        .eq('name', category)
        .single()

      if (categoryData) {
        await supabase
          .from('document_categories')
          .insert({
            document_id: document.id,
            category_id: categoryData.id
          })
      }
    }

    // Automatically trigger processing for embeddings
    try {
      const processUrl = `${process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000'}/api/knowledge/process`
      
      // Fire and forget - don't wait for processing to complete
      fetch(processUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          // Forward auth cookies for the process endpoint
          'Cookie': request.headers.get('cookie') || ''
        },
        body: JSON.stringify({ documentId: document.id })
      }).catch(err => {
        console.error('Failed to trigger processing:', err)
      })
      
      return NextResponse.json({
        success: true,
        document: {
          id: document.id,
          title: document.title,
          knowledge_base_id: knowledgeBase.id
        },
        message: 'Document uploaded successfully. Processing embeddings...',
        processing: true
      })
    } catch (error) {
      // If processing trigger fails, still return success for upload
      console.error('Processing trigger error:', error)
      
      return NextResponse.json({
        success: true,
        document: {
          id: document.id,
          title: document.title,
          knowledge_base_id: knowledgeBase.id
        },
        message: 'Document uploaded successfully. Please process manually.',
        processing: false
      })
    }

  } catch (error) {
    console.error('Knowledge upload error:', error)
    
    // More detailed error for debugging
    const errorMessage = error instanceof Error ? error.message : 'Unknown error'
    const errorDetails = {
      message: errorMessage,
      timestamp: new Date().toISOString(),
      environment: process.env.NODE_ENV
    }
    
    if (isDevelopment) {
      return NextResponse.json(
        { 
          error: 'Internal server error',
          details: errorDetails
        },
        { status: 500 }
      )
    }
    
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}