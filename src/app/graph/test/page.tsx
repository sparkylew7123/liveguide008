'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/utils/supabase/client'

export default function TestGraphPage() {
  const [data, setData] = useState<any>({ nodes: [], edges: [], error: null })
  const [loading, setLoading] = useState(true)
  
  useEffect(() => {
    const loadData = async () => {
      const supabase = createClient()
      
      try {
        const { data: { user } } = await supabase.auth.getUser()
        if (!user) {
          setData({ nodes: [], edges: [], error: 'No user' })
          setLoading(false)
          return
        }

        const { data: nodes, error: nodesError } = await supabase
          .from('graph_nodes')
          .select('*')
          .eq('user_id', user.id)
          .is('deleted_at', null)

        const { data: edges, error: edgesError } = await supabase
          .from('graph_edges')
          .select('*')
          .eq('user_id', user.id)
          .is('valid_to', null)

        setData({
          nodes: nodes || [],
          edges: edges || [],
          error: nodesError?.message || edgesError?.message || null
        })
      } catch (err: any) {
        setData({ nodes: [], edges: [], error: err.message })
      } finally {
        setLoading(false)
      }
    }

    loadData()
  }, [])

  if (loading) {
    return <div className="p-6">Loading...</div>
  }

  return (
    <div className="p-6">
      <h1 className="text-2xl font-bold mb-4">Test Graph Data</h1>
      
      {data.error && (
        <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-4">
          Error: {data.error}
        </div>
      )}
      
      <div className="mb-6">
        <h2 className="text-xl font-semibold mb-2">Nodes ({data.nodes.length})</h2>
        <pre className="bg-gray-100 p-4 rounded overflow-auto max-h-96">
          {JSON.stringify(data.nodes, null, 2)}
        </pre>
      </div>
      
      <div>
        <h2 className="text-xl font-semibold mb-2">Edges ({data.edges.length})</h2>
        <pre className="bg-gray-100 p-4 rounded overflow-auto max-h-96">
          {JSON.stringify(data.edges, null, 2)}
        </pre>
      </div>
    </div>
  )
}