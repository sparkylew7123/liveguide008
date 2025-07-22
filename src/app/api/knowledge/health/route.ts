import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/utils/supabase/server'
import { cookies } from 'next/headers'

export async function GET(request: NextRequest) {
  try {
    const cookieStore = await cookies()
    const supabase = createClient(cookieStore)

    const checks = {
      tables: {
        agent_knowledge_bases: false,
        knowledge_documents: false,
        document_chunks: false,
      },
      storage: {
        documents_bucket: false,
      },
      data: {
        maya_knowledge_base: false,
      },
      timestamp: new Date().toISOString(),
    }

    // Check tables
    const tableChecks = [
      { name: 'agent_knowledge_bases', key: 'agent_knowledge_bases' },
      { name: 'knowledge_documents', key: 'knowledge_documents' },
      { name: 'document_chunks', key: 'document_chunks' },
    ]

    for (const { name, key } of tableChecks) {
      const { error } = await supabase.from(name).select('id').limit(1)
      checks.tables[key] = !error
    }

    // Check storage bucket
    const { data: buckets, error: bucketsError } = await supabase.storage.listBuckets()
    if (!bucketsError && buckets) {
      checks.storage.documents_bucket = buckets.some(b => b.name === 'documents')
    }

    // Check Maya's knowledge base
    const { data: mayaKb } = await supabase
      .from('agent_knowledge_bases')
      .select('id')
      .eq('agent_id', 'SuIlXQ4S6dyjrNViOrQ8')
      .single()
    
    checks.data.maya_knowledge_base = !!mayaKb

    // Determine overall health
    const allTableChecks = Object.values(checks.tables).every(v => v === true)
    const allStorageChecks = Object.values(checks.storage).every(v => v === true)
    const healthy = allTableChecks && allStorageChecks

    return NextResponse.json({
      status: healthy ? 'healthy' : 'unhealthy',
      checks,
      message: healthy 
        ? 'Knowledge upload system is operational' 
        : 'Knowledge upload system needs configuration'
    })

  } catch (error) {
    console.error('Health check error:', error)
    return NextResponse.json(
      { 
        status: 'error',
        message: 'Failed to perform health check',
        error: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    )
  }
}