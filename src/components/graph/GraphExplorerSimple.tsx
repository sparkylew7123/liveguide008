'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/utils/supabase/client'
import { GraphCanvas } from './GraphCanvas'
import { Card } from '@/components/ui/card'

export function GraphExplorerSimple() {
  const [nodes, setNodes] = useState<any[]>([])
  const [edges, setEdges] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const supabase = createClient()

  useEffect(() => {
    loadGraphData()
  }, [])

  const loadGraphData = async () => {
    console.log('Loading graph data directly from database...')
    try {
      // Get current user
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) {
        setError('No authenticated user')
        setLoading(false)
        return
      }

      console.log('User ID:', user.id)

      // Fetch nodes directly from database
      const { data: graphNodes, error: nodesError } = await supabase
        .from('graph_nodes')
        .select('*')
        .eq('user_id', user.id)
        .is('deleted_at', null)

      if (nodesError) {
        console.error('Error fetching nodes:', nodesError)
        setError(`Failed to fetch nodes: ${nodesError.message}`)
        setLoading(false)
        return
      }

      console.log('Fetched nodes:', graphNodes)

      // Fetch edges
      const { data: graphEdges, error: edgesError } = await supabase
        .from('graph_edges')
        .select('*')
        .eq('user_id', user.id)
        .is('valid_to', null)

      if (edgesError) {
        console.error('Error fetching edges:', edgesError)
      }

      console.log('Fetched edges:', graphEdges)

      // Transform to Cytoscape format
      const cytoscapeNodes = (graphNodes || []).map(node => ({
        data: {
          id: node.id,
          label: node.label,
          type: node.node_type,
          properties: node.properties
        }
      }))

      const cytoscapeEdges = (graphEdges || []).map(edge => ({
        data: {
          id: edge.id,
          source: edge.source_node_id,
          target: edge.target_node_id,
          label: edge.edge_type,
          properties: edge.properties
        }
      }))

      setNodes(cytoscapeNodes)
      setEdges(cytoscapeEdges)
      setError(null)
    } catch (err) {
      console.error('Error in loadGraphData:', err)
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900"></div>
      </div>
    )
  }

  if (error) {
    return (
      <Card className="p-6">
        <p className="text-red-600">Error: {error}</p>
        <button 
          onClick={loadGraphData}
          className="mt-4 px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600"
        >
          Retry
        </button>
      </Card>
    )
  }

  return (
    <div className="space-y-4">
      <Card className="p-4">
        <p>Nodes: {nodes.length} | Edges: {edges.length}</p>
      </Card>
      
      <div className="h-[600px] border rounded">
        <GraphCanvas
          nodes={nodes}
          edges={edges}
          onNodeClick={(node) => console.log('Node clicked:', node)}
          selectedNodeId={null}
        />
      </div>
    </div>
  )
}