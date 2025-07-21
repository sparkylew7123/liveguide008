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

    // Get knowledge base for agent
    const { data: knowledgeBase, error: kbError } = await supabase
      .from('agent_knowledge_bases')
      .select('id')
      .eq('agent_id', agentId)
      .single()

    if (kbError || !knowledgeBase) {
      return NextResponse.json(
        { error: 'Knowledge base not found for agent' },
        { status: 404 }
      )
    }

    // Upload file to Supabase Storage
    const fileName = `${Date.now()}-${file.name}`
    const filePath = `knowledge/${agentId}/${fileName}`
    
    const { error: uploadError } = await supabase.storage
      .from('documents')
      .upload(filePath, file)

    if (uploadError) {
      console.error('Upload error:', uploadError)
      return NextResponse.json(
        { error: 'Failed to upload file' },
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
        kb_id: knowledgeBase.id,
        title: file.name,
        content: content,
        content_type: file.type,
        source_url: filePath,
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
        .eq('kb_id', knowledgeBase.id)
        .eq('category', category)
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
        kb_id: knowledgeBase.id
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