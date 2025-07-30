import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/utils/supabase/server'
import { createServiceRoleClient } from '@/utils/supabase/service-role'
import { chunkText, generateChunkEmbeddings } from '@/services/embeddings'

// This endpoint processes documents to generate embeddings
// In production, this would be called by a queue worker
export async function POST(request: NextRequest) {
  try {
    // Use regular client for auth check
    const authClient = await createClient()
    
    // Use service role client for database operations
    const supabase = createServiceRoleClient()

    // Check authentication
    const { data: { user }, error: authError } = await authClient.auth.getUser()
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { documentId } = await request.json()

    if (!documentId) {
      return NextResponse.json(
        { error: 'Document ID is required' },
        { status: 400 }
      )
    }

    // Get document
    const { data: document, error: docError } = await supabase
      .from('knowledge_documents')
      .select('*')
      .eq('id', documentId)
      .single()

    if (docError || !document) {
      return NextResponse.json(
        { error: 'Document not found' },
        { status: 404 }
      )
    }

    // Check if document already has chunks
    const { data: existingChunks } = await supabase
      .from('knowledge_chunks')
      .select('id')
      .eq('document_id', documentId)
      .limit(1)

    if (existingChunks && existingChunks.length > 0) {
      return NextResponse.json({
        success: true,
        message: 'Document already has embeddings'
      })
    }

    // Chunk the document
    const chunks = chunkText(document.content, 1500, 200)
    
    // Generate embeddings for each chunk
    const chunkEmbeddings = await generateChunkEmbeddings(chunks)

    // Store chunks with their embeddings
    const chunkRecords = chunkEmbeddings.map((chunk, index) => ({
      document_id: documentId,
      content: chunk.text,
      embedding: chunk.embedding,
      chunk_index: index,
      metadata: {
        title: document.title,
        chunk_number: index + 1,
        total_chunks: chunks.length
      }
    }))

    // Insert chunks in batches to avoid timeout
    const BATCH_SIZE = 10
    for (let i = 0; i < chunkRecords.length; i += BATCH_SIZE) {
      const batch = chunkRecords.slice(i, i + BATCH_SIZE)
      const { error: chunkError } = await supabase
        .from('knowledge_chunks')
        .insert(batch)

      if (chunkError) {
        console.error('Chunk insertion error:', chunkError)
        throw new Error(`Failed to insert chunks: ${chunkError.message}`)
      }
    }

    // Update document with chunk count and processing status
    const { error: updateError } = await supabase
      .from('knowledge_documents')
      .update({ 
        chunk_count: chunks.length,
        updated_at: new Date().toISOString()
      })
      .eq('id', documentId)

    // Update knowledge base stats
    const { data: kb } = await supabase
      .from('knowledge_documents')
      .select('knowledge_base_id')
      .eq('id', documentId)
      .single()

    if (kb) {
      const { data: stats } = await supabase
        .from('knowledge_documents')
        .select('chunk_count')
        .eq('knowledge_base_id', kb.knowledge_base_id)

      const totalChunks = stats?.reduce((sum, doc) => sum + (doc.chunk_count || 0), 0) || 0
      
      await supabase
        .from('agent_knowledge_bases')
        .update({
          document_count: stats?.length || 0,
          total_chunks: totalChunks,
          indexing_status: 'indexed'
        })
        .eq('id', kb.knowledge_base_id)
    }

    if (updateError) {
      console.error('Update error:', updateError)
      return NextResponse.json(
        { error: 'Failed to update document embeddings' },
        { status: 500 }
      )
    }

    return NextResponse.json({
      success: true,
      message: 'Embeddings generated successfully',
      documentId: documentId,
      chunksCreated: chunks.length
    })

  } catch (error) {
    console.error('Document processing error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

// GET endpoint to check processing status
export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient()

    const { searchParams } = new URL(request.url)
    const documentId = searchParams.get('documentId')

    if (!documentId) {
      return NextResponse.json(
        { error: 'Document ID is required' },
        { status: 400 }
      )
    }

    const { data: document, error } = await supabase
      .from('knowledge_documents')
      .select('id, title, chunk_count')
      .eq('id', documentId)
      .single()

    if (error || !document) {
      return NextResponse.json(
        { error: 'Document not found' },
        { status: 404 }
      )
    }

    // Check if chunks exist
    const { data: chunks } = await supabase
      .from('knowledge_chunks')
      .select('id')
      .eq('document_id', documentId)
      .limit(1)

    return NextResponse.json({
      documentId: document.id,
      title: document.title,
      chunkCount: document.chunk_count || 0,
      hasEmbeddings: chunks && chunks.length > 0,
      status: chunks && chunks.length > 0 ? 'completed' : 'pending'
    })

  } catch (error) {
    console.error('Status check error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}