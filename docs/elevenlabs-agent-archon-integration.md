# ElevenLabs Agent - Archon Knowledge Base Integration

## Overview
This document ensures the ElevenLabs voice expert agent references Archon's knowledge base when reviewing LiveGuide code.

## Required Knowledge Base Sources

The ElevenLabs agent MUST reference these Archon knowledge base sources when analyzing code:

### Primary Sources
1. **elevenlabs.io** - Official ElevenLabs Conversational AI documentation
   - RAG implementation patterns
   - Voice agent configuration
   - SDK integration methods
   - Webhook specifications

2. **file_elevenlabs-liveguide-integration_md** - LiveGuide-specific integration
   - MCP server implementation
   - Webhook handlers
   - Data extraction patterns
   - Real-time graph updates

3. **github.com** (LiveGuide008 repository)
   - Current codebase implementation
   - Existing voice components
   - Graph database schema
   - Edge function implementations

### Supporting Sources
4. **modelcontextprotocol.io** - MCP standard documentation
   - Protocol specifications
   - Tool definitions
   - Server implementation patterns

5. **nextjs.org** - Frontend framework documentation
   - React component patterns
   - API route handling
   - WebSocket integration

## Agent Instructions

When the ElevenLabs voice expert agent is invoked, it should:

### 1. Knowledge Base Query Protocol
```typescript
// Before code review, query relevant knowledge
const relevantDocs = await archon.performRAGQuery({
  query: "ElevenLabs voice agent integration patterns",
  sources: ["elevenlabs.io", "file_elevenlabs-liveguide-integration_md"],
  matchCount: 5
});

// Search for code examples
const codeExamples = await archon.searchCodeExamples({
  query: "useElevenLabsConversation hook implementation",
  sourceId: "github.com",
  matchCount: 3
});
```

### 2. Code Review Checklist with Knowledge Base

When reviewing ElevenLabs integration code, verify against:

#### Voice Agent Configuration
- [ ] Check against `elevenlabs.io` docs for proper agent setup
- [ ] Verify dynamic variables match documentation requirements
- [ ] Confirm webhook URLs follow specification

#### RAG Context Implementation
- [ ] Validate RAG context structure against knowledge base examples
- [ ] Ensure proper data formatting for agent consumption
- [ ] Check semantic search implementation patterns

#### MCP Server Integration
- [ ] Compare with `modelcontextprotocol.io` standards
- [ ] Verify tool definitions match protocol
- [ ] Check SSE/HTTP streaming implementation

#### LiveGuide-Specific Patterns
- [ ] Match existing patterns in `github.com` repository
- [ ] Follow established graph database conventions
- [ ] Maintain consistency with edge function patterns

### 3. Knowledge Base References in Responses

The agent should include knowledge base citations:

```markdown
## Analysis Results

Based on the ElevenLabs documentation (source: elevenlabs.io, section: RAG Integration):
- Your RAG context implementation correctly follows the pattern...

According to the LiveGuide integration framework (source: file_elevenlabs-liveguide-integration_md):
- The MCP server should implement these specific tools...

Comparing with existing codebase (source: github.com/sparkylew7123/liveguide008):
- The useElevenLabsConversation hook pattern is consistent...
```

## Automated Knowledge Base Integration

### Pre-Analysis Phase
```javascript
async function preAnalyzeWithKnowledgeBase(codeToReview) {
  // 1. Extract key concepts from code
  const concepts = extractConcepts(codeToReview);
  
  // 2. Query knowledge base for each concept
  const knowledgeContext = await Promise.all(
    concepts.map(concept => 
      archon.performRAGQuery({
        query: concept,
        sources: ELEVENLABS_KNOWLEDGE_SOURCES
      })
    )
  );
  
  // 3. Build comprehensive context
  return buildAnalysisContext(knowledgeContext);
}
```

### During Analysis
```javascript
async function analyzeWithKnowledge(code, context) {
  // Cross-reference code patterns with knowledge base
  const patterns = await archon.searchCodeExamples({
    query: extractPatternSignature(code),
    sourceId: "github.com"
  });
  
  // Validate against official documentation
  const validation = validateAgainstDocs(code, context);
  
  return {
    analysis: performAnalysis(code),
    knowledgeBaseReferences: context,
    similarPatterns: patterns,
    validationResults: validation
  };
}
```

## Configuration for Agent Invocation

When invoking the ElevenLabs agent, include this context:

```javascript
const elevenlabsAgentConfig = {
  name: "elevenlabs-voice-expert",
  knowledgeBaseConfig: {
    enabled: true,
    sources: [
      "elevenlabs.io",
      "file_elevenlabs-liveguide-integration_md",
      "github.com",
      "modelcontextprotocol.io"
    ],
    autoQuery: true,
    includeCodeExamples: true,
    citeSources: true
  },
  analysisMode: {
    checkDocumentation: true,
    validatePatterns: true,
    suggestImprovements: true,
    referenceKnowledgeBase: true
  }
};
```

## Verification Steps

1. **Before Code Review**
   - Query Archon knowledge base for relevant documentation
   - Load recent code examples from repository
   - Fetch latest ElevenLabs API specifications

2. **During Code Review**
   - Cross-reference implementations with documentation
   - Compare patterns with existing codebase
   - Validate against official specifications

3. **In Response**
   - Include knowledge base citations
   - Reference specific documentation sections
   - Link to relevant code examples

## Example Agent Invocation with Knowledge Base

```typescript
// When reviewing ElevenLabs code
const reviewRequest = {
  agent: "elevenlabs-voice-expert",
  task: "Review useElevenLabsConversation hook implementation",
  context: {
    useArchonKnowledge: true,
    knowledgeSources: [
      "elevenlabs.io",
      "file_elevenlabs-liveguide-integration_md"
    ],
    includeCodeExamples: true,
    checkAgainstDocs: true
  },
  code: codeToReview
};

// Agent will automatically:
// 1. Query Archon knowledge base
// 2. Find relevant documentation
// 3. Search for similar code patterns
// 4. Provide analysis with citations
```

## Knowledge Base Update Protocol

When new ElevenLabs features or patterns are discovered:

1. Update the LiveGuide integration documentation
2. Add new patterns to the knowledge base
3. Tag with appropriate metadata for future queries
4. Notify the ElevenLabs agent of updates

## Monitoring and Compliance

- Track knowledge base queries from ElevenLabs agent
- Ensure citations are included in responses
- Verify documentation references are current
- Update integration patterns as needed

---

This configuration ensures the ElevenLabs voice expert agent always references and cites the Archon knowledge base when reviewing code, providing accurate, well-documented analysis based on official documentation and existing patterns.