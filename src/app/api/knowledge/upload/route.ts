import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/utils/supabase/server'
import { cookies } from 'next/headers'

export async function POST(request: NextRequest) {
  try {
    const cookieStore = await cookies()
    const supabase = createClient(cookieStore)

    // Check authentication
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
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

    // Validate file type
    const allowedTypes = ['text/plain', 'text/markdown', 'application/pdf', 'text/html']
    if (!allowedTypes.includes(file.type)) {
      return NextResponse.json(
        { error: 'Invalid file type. Allowed: txt, md, pdf, html' },
        { status: 400 }
      )
    }

    // Get or create knowledge base for agent
    let { data: knowledgeBase, error: kbError } = await supabase
      .from('agent_knowledge_bases')
      .select('id')
      .eq('agent_id', agentId)
      .single()

    if (kbError || !knowledgeBase) {
      // Create knowledge base if it doesn't exist
      const { data: newKb, error: createError } = await supabase
        .from('agent_knowledge_bases')
        .insert({
          agent_id: agentId,
          name: 'Maya Coaching Knowledge Base',
          description: 'Knowledge base for Maya AI coach'
        })
        .select()
        .single()
      
      if (createError) {
        console.error('KB creation error:', createError)
        return NextResponse.json(
          { error: 'Failed to create knowledge base' },
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
        metadata: metadata ? JSON.parse(metadata) : {}
      })
      .select()
      .single()

    if (docError) {
      console.error('Document creation error:', docError)
      return NextResponse.json(
        { error: 'Failed to create document record' },
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

    // Queue document for embedding generation
    // In production, this would trigger an async job
    // For now, we'll just return success
    
    return NextResponse.json({
      success: true,
      document: {
        id: document.id,
        title: document.title,
        knowledge_base_id: knowledgeBase.id
      },
      message: 'Document uploaded successfully. Embeddings will be generated shortly.'
    })

  } catch (error) {
    console.error('Knowledge upload error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}