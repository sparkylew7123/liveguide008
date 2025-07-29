'use client'

import { useState, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { AlertCircle, FileText, Upload, Search, Loader2 } from 'lucide-react'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { createClient } from '@/utils/supabase/client'

interface Agent {
  uuid: string;
  Name: string;
  '11labs_agentID': string;
  availability_status: string;
}

export default function KnowledgeManagementPage() {
  const [file, setFile] = useState<File | null>(null)
  const [agentId, setAgentId] = useState('') // Will be set to first available agent
  const [category, setCategory] = useState('')
  const [metadata, setMetadata] = useState('')
  const [uploading, setUploading] = useState(false)
  const [uploadMessage, setUploadMessage] = useState('')
  const [searchQuery, setSearchQuery] = useState('')
  const [searchResults, setSearchResults] = useState<any[]>([])
  const [searching, setSearching] = useState(false)
  const [agents, setAgents] = useState<Agent[]>([])
  const [loadingAgents, setLoadingAgents] = useState(true)
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    setMounted(true)
    fetchAgents()
  }, [])

  const fetchAgents = async () => {
    try {
      setLoadingAgents(true)
      const supabase = createClient()
      
      const { data, error } = await supabase
        .from('agent_personae')
        .select('uuid, Name, "11labs_agentID", availability_status')
        .not('11labs_agentID', 'is', null)
        .order('Name')
      
      if (error) {
        console.error('Error fetching agents:', error)
      } else {
        setAgents(data || [])
        // Set default agent to first available agent
        if (data && data.length > 0) {
          const defaultAgent = data.find(a => a['11labs_agentID']) || data[0]
          setAgentId(defaultAgent['11labs_agentID'])
        }
      }
    } catch (error) {
      console.error('Error fetching agents:', error)
    } finally {
      setLoadingAgents(false)
    }
  }

  const handleFileUpload = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!file) return

    setUploading(true)
    setUploadMessage('')

    const formData = new FormData()
    formData.append('file', file)
    formData.append('agentId', agentId)
    if (category) formData.append('category', category)
    if (metadata) formData.append('metadata', metadata)

    try {
      const response = await fetch('/api/knowledge/upload', {
        method: 'POST',
        body: formData
      })

      const result = await response.json()

      if (response.ok) {
        setUploadMessage('Document uploaded successfully! Processing embeddings...')
        setFile(null)
        setCategory('')
        setMetadata('')
        
        // Trigger processing (in production, this would be automatic)
        if (result.document?.id) {
          await fetch('/api/knowledge/process', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ documentId: result.document.id })
          })
        }
      } else {
        setUploadMessage(`Error: ${result.error}`)
      }
    } catch (error) {
      setUploadMessage('Upload failed. Please try again.')
    } finally {
      setUploading(false)
    }
  }

  const handleSearch = async () => {
    if (!searchQuery.trim()) return

    setSearching(true)
    try {
      const response = await fetch('/api/knowledge/search', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          query: searchQuery,
          agentId: agentId,
          limit: 5,
          searchType: 'hybrid'
        })
      })

      const result = await response.json()
      if (response.ok) {
        setSearchResults(result.results || [])
      } else {
        console.error('Search error:', result.error)
        setSearchResults([])
      }
    } catch (error) {
      console.error('Search failed:', error)
      setSearchResults([])
    } finally {
      setSearching(false)
    }
  }

  return (
    <div className="container mx-auto py-8 px-4">
      <h1 className="text-3xl font-bold mb-8">Knowledge Base Management</h1>
      
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Upload Section */}
        <Card>
          <CardHeader>
            <CardTitle>Upload Knowledge Document</CardTitle>
            <CardDescription>
              Add coaching materials to the agent's knowledge base
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleFileUpload} className="space-y-4">
              <div>
                <Label htmlFor="agent">Agent</Label>
                {mounted ? (
                  <Select 
                    value={agentId} 
                    onValueChange={setAgentId}
                    disabled={loadingAgents || agents.length === 0}
                  >
                    <SelectTrigger className="w-full">
                      <SelectValue placeholder={loadingAgents ? "Loading agents..." : "Select an agent"} />
                    </SelectTrigger>
                    <SelectContent>
                      {agents.map((agent) => (
                        <SelectItem 
                          key={agent.uuid} 
                          value={agent['11labs_agentID']}
                        >
                          {agent.Name}
                          {agent.availability_status !== 'available' && ' (Unavailable)'}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                ) : (
                  <div className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm">
                    Loading agents...
                  </div>
                )}
              </div>

              <div>
                <Label htmlFor="file">Document File</Label>
                <Input
                  id="file"
                  type="file"
                  accept=".txt,.md,.pdf,.html"
                  onChange={(e) => setFile(e.target.files?.[0] || null)}
                  className="cursor-pointer"
                />
                <p className="text-sm text-muted-foreground mt-1">
                  Supported: TXT, Markdown, PDF, HTML
                </p>
              </div>

              <div>
                <Label htmlFor="category">Category (Optional)</Label>
                <Input
                  id="category"
                  value={category}
                  onChange={(e) => setCategory(e.target.value)}
                  placeholder="e.g., Career Development"
                />
              </div>

              <div>
                <Label htmlFor="metadata">Metadata (Optional JSON)</Label>
                <Textarea
                  id="metadata"
                  value={metadata}
                  onChange={(e) => setMetadata(e.target.value)}
                  placeholder='{"tags": ["goals", "planning"], "level": "beginner"}'
                  rows={3}
                />
              </div>

              <Button type="submit" disabled={!file || uploading} className="w-full">
                {uploading ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Uploading...
                  </>
                ) : (
                  <>
                    <Upload className="mr-2 h-4 w-4" />
                    Upload Document
                  </>
                )}
              </Button>

              {uploadMessage && (
                <Alert>
                  <AlertCircle className="h-4 w-4" />
                  <AlertDescription>{uploadMessage}</AlertDescription>
                </Alert>
              )}
            </form>
          </CardContent>
        </Card>

        {/* Search Section */}
        <Card>
          <CardHeader>
            <CardTitle>Search Knowledge Base</CardTitle>
            <CardDescription>
              Test the RAG search functionality
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="flex gap-2">
                <Input
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Search for coaching topics..."
                  onKeyPress={(e) => e.key === 'Enter' && handleSearch()}
                />
                <Button onClick={handleSearch} disabled={searching}>
                  {searching ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <Search className="h-4 w-4" />
                  )}
                </Button>
              </div>

              {searchResults.length > 0 && (
                <div className="space-y-3">
                  <h3 className="font-semibold">Search Results:</h3>
                  {searchResults.map((result, index) => (
                    <Card key={result.id || index} className="p-3">
                      <div className="flex items-start gap-2">
                        <FileText className="h-4 w-4 mt-1 text-muted-foreground" />
                        <div className="flex-1">
                          <h4 className="font-medium">{result.title}</h4>
                          <p className="text-sm text-muted-foreground mt-1">
                            {result.excerpt}
                          </p>
                          {result.score > 0 && (
                            <p className="text-xs text-muted-foreground mt-1">
                              Relevance: {(result.score * 100).toFixed(1)}%
                            </p>
                          )}
                        </div>
                      </div>
                    </Card>
                  ))}
                </div>
              )}

              {searchQuery && searchResults.length === 0 && !searching && (
                <p className="text-muted-foreground text-center py-4">
                  No results found
                </p>
              )}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Instructions */}
      <Card className="mt-8">
        <CardHeader>
          <CardTitle>Knowledge Base Integration</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="prose dark:prose-invert max-w-none">
            <h3>How it works:</h3>
            <ol className="list-decimal list-inside space-y-2">
              <li>Upload coaching documents to the knowledge base</li>
              <li>Documents are automatically processed to generate embeddings</li>
              <li>The agent can retrieve relevant information during conversations</li>
              <li>Use hybrid search (semantic + keyword) for best results</li>
            </ol>
            
            <h3 className="mt-4">Best Practices:</h3>
            <ul className="list-disc list-inside space-y-2">
              <li>Use clear, descriptive titles for documents</li>
              <li>Break large documents into focused topics</li>
              <li>Include metadata for better filtering and categorization</li>
              <li>Test search queries to ensure content is retrievable</li>
            </ul>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}