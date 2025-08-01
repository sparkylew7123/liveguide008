'use client'

import dynamic from 'next/dynamic'

const GraphExplorerSimple = dynamic(
  () => import('@/components/graph/GraphExplorerSimple').then(mod => mod.GraphExplorerSimple),
  { 
    ssr: false,
    loading: () => <div className="flex items-center justify-center h-96">
      <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900"></div>
    </div>
  }
)

export default function SimpleGraphPage() {
  return (
    <div className="container mx-auto p-6">
      <h1 className="text-2xl font-bold mb-6">Simple Graph View (Direct DB Query)</h1>
      <GraphExplorerSimple />
    </div>
  )
}