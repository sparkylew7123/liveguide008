'use client'

import { GraphExplorerSimple } from '@/components/graph/GraphExplorerSimple'

export default function SimpleGraphPage() {
  return (
    <div className="container mx-auto p-6">
      <h1 className="text-2xl font-bold mb-6">Simple Graph View (Direct DB Query)</h1>
      <GraphExplorerSimple />
    </div>
  )
}