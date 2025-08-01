'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/utils/supabase/client'

export default function TestDirectPage() {
  const [status, setStatus] = useState<any>({})
  const [loading, setLoading] = useState(true)
  
  useEffect(() => {
    const testConnection = async () => {
      const supabase = createClient()
      
      try {
        // Test 1: Check if we can get user
        const { data: { user }, error: userError } = await supabase.auth.getUser()
        setStatus(prev => ({ ...prev, user: user ? 'Found' : 'Not found', userError: userError?.message }))
        
        if (!user) {
          setLoading(false)
          return
        }
        
        // Test 2: Try direct query
        const { data: nodes, error: nodesError } = await supabase
          .from('graph_nodes')
          .select('id, label, node_type')
          .eq('user_id', user.id)
          .is('deleted_at', null)
          .limit(5)
          
        setStatus(prev => ({ 
          ...prev, 
          nodesCount: nodes?.length || 0,
          nodesError: nodesError?.message,
          nodes: nodes
        }))
        
        // Test 3: Check Supabase URL
        setStatus(prev => ({ 
          ...prev, 
          supabaseUrl: process.env.NEXT_PUBLIC_SUPABASE_URL,
          hasAnonKey: !!process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
        }))
        
      } catch (err: any) {
        setStatus(prev => ({ ...prev, generalError: err.message }))
      } finally {
        setLoading(false)
      }
    }
    
    testConnection()
  }, [])
  
  if (loading) {
    return <div className="p-6">Testing connections...</div>
  }
  
  return (
    <div className="p-6">
      <h1 className="text-2xl font-bold mb-4">Direct Database Connection Test</h1>
      
      <div className="space-y-4">
        <div className="bg-gray-100 p-4 rounded">
          <h2 className="font-semibold mb-2">User Status</h2>
          <p>User: {status.user || 'None'}</p>
          {status.userError && <p className="text-red-600">Error: {status.userError}</p>}
        </div>
        
        <div className="bg-gray-100 p-4 rounded">
          <h2 className="font-semibold mb-2">Database Query</h2>
          <p>Nodes found: {status.nodesCount}</p>
          {status.nodesError && <p className="text-red-600">Error: {status.nodesError}</p>}
          {status.nodes && (
            <pre className="mt-2 text-xs overflow-auto">
              {JSON.stringify(status.nodes, null, 2)}
            </pre>
          )}
        </div>
        
        <div className="bg-gray-100 p-4 rounded">
          <h2 className="font-semibold mb-2">Environment</h2>
          <p>Supabase URL: {status.supabaseUrl ? 'Set' : 'Not set'}</p>
          <p>Has Anon Key: {status.hasAnonKey ? 'Yes' : 'No'}</p>
        </div>
        
        {status.generalError && (
          <div className="bg-red-100 p-4 rounded">
            <h2 className="font-semibold mb-2">General Error</h2>
            <p className="text-red-600">{status.generalError}</p>
          </div>
        )}
      </div>
    </div>
  )
}