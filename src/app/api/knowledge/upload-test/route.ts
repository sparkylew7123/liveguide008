import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/utils/supabase/server'
import { createClient as createServiceClient } from '@supabase/supabase-js'

// Test endpoint that uses service role for authentication bypass
export async function POST(request: NextRequest) {
  const isDevelopment = process.env.NODE_ENV === 'development'
  
  try {
    // Use service role client to bypass RLS
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
    const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!
    
    if (!supabaseServiceKey) {
      return NextResponse.json(
        { error: 'Service role key not configured' },
        { status: 500 }
      )
    }
    
    const supabase = createServiceClient(supabaseUrl, supabaseServiceKey)

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

    // Log file details
    console.log('Test upload - File details:', {
      name: file.name,
      type: file.type,
      size: file.size,
      agentId: agentId
    })

    // Validate file size (50MB limit)
    const MAX_FILE_SIZE = 50 * 1024 * 1024;
    if (file.size > MAX_FILE_SIZE) {
      return NextResponse.json(
        { error: 'File too large. Maximum size is 50MB' },
        { status: 400 }
      )
    }

    // Check file extension for markdown
    const fileExtension = file.name.split('.').pop()?.toLowerCase()
    const isMarkdownFile = fileExtension === 'md' || fileExtension === 'markdown'
    
    // Validate file type
    const allowedTypes = [
      'text/plain', 
      'text/markdown', 
      'text/x-markdown',
      'application/x-markdown',
      'application/pdf', 
      'text/html'
    ]
    
    if (!allowedTypes.includes(file.type) && !isMarkdownFile) {
      return NextResponse.json(
        { error: `Invalid file type: ${file.type}. Allowed: txt, md, pdf, html` },
        { status: 400 }
      )
    }

    // Get or create knowledge base
    let { data: knowledgeBase, error: kbError } = await supabase
      .from('agent_knowledge_bases')
      .select('*')
      .eq('agent_id', agentId)
      .single()

    console.log('Knowledge base lookup:', { knowledgeBase, kbError })

    if (!knowledgeBase) {
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
        console.error('KB creation error:', createError)
        return NextResponse.json(
          { error: `Failed to create knowledge base: ${createError.message}` },
          { status: 500 }
        )
      }
      
      knowledgeBase = newKb
    }

    // Get file content
    let content = ''
    if (file.type === 'text/plain' || file.type === 'text/markdown' || isMarkdownFile) {
      content = await file.text()
    } else {
      content = `Content from ${file.name} - processing required`
    }

    // Create document record (without storage for now)
    const { data: document, error: docError } = await supabase
      .from('knowledge_documents')
      .insert({
        knowledge_base_id: knowledgeBase.id,
        title: file.name,
        content: content,
        document_type: isMarkdownFile ? 'markdown' : 
                       file.type === 'text/plain' ? 'text' : 
                       file.type === 'application/pdf' ? 'pdf' : 'html',
        source_url: `test/${file.name}`,
        content_hash: `${file.name}-${Date.now()}`,
        chunk_count: 0,
        metadata: metadata ? JSON.parse(metadata) : {}
      })
      .select()
      .single()

    if (docError) {
      console.error('Document creation error:', docError)
      return NextResponse.json(
        { error: `Failed to create document: ${docError.message}` },
        { status: 500 }
      )
    }

    return NextResponse.json({
      success: true,
      message: 'Test upload successful',
      document: {
        id: document.id,
        title: document.title,
        knowledge_base_id: knowledgeBase.id
      }
    })

  } catch (error) {
    console.error('Test upload error:', error)
    return NextResponse.json(
      { 
        error: 'Internal server error',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    )
  }
}