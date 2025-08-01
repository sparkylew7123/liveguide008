'use client'

import { useEffect, useState, useRef } from 'react'
import { createClient } from '@/utils/supabase/client'

export default function MinimalGraphPage() {
  const [data, setData] = useState<any>({ nodes: [], edges: [], error: null })
  const [loading, setLoading] = useState(true)
  const containerRef = useRef<HTMLDivElement>(null)
  const [cyInstance, setCyInstance] = useState<any>(null)
  
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

  useEffect(() => {
    if (!containerRef.current || loading || data.nodes.length === 0) return

    // Dynamically import cytoscape only on client side
    import('cytoscape').then((cytoscapeModule) => {
      const cytoscape = cytoscapeModule.default
      
      const cy = cytoscape({
        container: containerRef.current,
        elements: [
          ...data.nodes.map((node: any) => ({
            data: {
              id: node.id,
              label: node.label,
              type: node.node_type
            }
          })),
          ...data.edges.map((edge: any) => ({
            data: {
              id: edge.id,
              source: edge.source_node_id,
              target: edge.target_node_id
            }
          }))
        ],
        style: [
          {
            selector: 'node',
            style: {
              'label': 'data(label)',
              'text-valign': 'center',
              'text-halign': 'center',
              'background-color': '#666',
              'color': '#000',
              'text-outline-width': 2,
              'text-outline-color': '#fff',
              'font-size': '12px',
              'width': 40,
              'height': 40
            }
          },
          {
            selector: 'edge',
            style: {
              'width': 2,
              'line-color': '#ccc',
              'curve-style': 'bezier'
            }
          }
        ],
        layout: {
          name: 'grid'
        }
      })

      setCyInstance(cy)
    }).catch(err => {
      console.error('Error loading cytoscape:', err)
      setData(prev => ({ ...prev, error: 'Failed to load graph library' }))
    })

    return () => {
      if (cyInstance) {
        cyInstance.destroy()
      }
    }
  }, [loading, data])

  if (loading) {
    return <div className="p-6">Loading...</div>
  }

  return (
    <div className="p-6">
      <h1 className="text-2xl font-bold mb-4">Minimal Graph Visualization</h1>
      
      {data.error && (
        <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-4">
          Error: {data.error}
        </div>
      )}
      
      <div className="mb-4">
        <p>Nodes: {data.nodes.length} | Edges: {data.edges.length}</p>
      </div>
      
      <div 
        ref={containerRef} 
        className="w-full h-[600px] border border-gray-300 rounded"
        style={{ position: 'relative' }}
      />
      
      <div className="mt-4 text-sm text-gray-600">
        <p>This is a minimal Cytoscape implementation with dynamic import.</p>
      </div>
    </div>
  )
}