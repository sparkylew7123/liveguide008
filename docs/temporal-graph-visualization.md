# Temporal Graph Visualization for LiveGuide

## Overview

This document outlines the implementation plan for adding temporal (time-based) visualization capabilities to LiveGuide's knowledge graph. The goal is to show how a user's knowledge graph evolves over time, using coaching sessions as temporal markers.

## Core Concept

Transform the static knowledge graph into a dynamic, time-aware visualization that shows:
- How nodes (goals, emotions, skills) evolve over time
- Which topics are discussed in each coaching session
- Progress and changes between sessions
- Patterns and trends in personal growth

## Architecture Decision

### Chosen Approach: Event-Based Architecture

We will implement an event-sourcing pattern to track all changes to the graph over time.

```typescript
interface GraphEvent {
  id: string;
  timestamp: Date;
  sessionId?: string;
  nodeId?: string;
  eventType: 'node_created' | 'node_updated' | 'edge_created' | 'edge_removed' | 'progress_changed';
  previousState?: any;
  newState: any;
  metadata?: {
    emotion?: string;
    confidence?: number;
    notes?: string;
  };
}
```

### Why Event-Based?

1. **Granular History**: Track every change, not just snapshots
2. **Efficient Storage**: Only store deltas, not full graph copies
3. **Flexible Playback**: Reconstruct graph at any point in time
4. **Audit Trail**: Complete history of coaching journey

## Database Schema Changes

### New Tables

```sql
-- Track all graph change events
CREATE TABLE graph_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) NOT NULL,
  node_id uuid REFERENCES graph_nodes(id),
  session_id uuid REFERENCES graph_nodes(id), -- session nodes
  event_type text NOT NULL,
  previous_state jsonb,
  new_state jsonb,
  metadata jsonb,
  created_at timestamptz DEFAULT now(),
  created_by uuid REFERENCES auth.users(id)
);

-- Index for efficient temporal queries
CREATE INDEX idx_graph_events_user_time ON graph_events(user_id, created_at);
CREATE INDEX idx_graph_events_session ON graph_events(session_id);
```

### Updates to Existing Tables

```sql
-- Add temporal tracking to nodes
ALTER TABLE graph_nodes 
ADD COLUMN first_mentioned_at timestamptz DEFAULT now(),
ADD COLUMN last_discussed_at timestamptz DEFAULT now(),
ADD COLUMN session_mentions jsonb DEFAULT '[]'::jsonb;

-- Add temporal metadata to edges
ALTER TABLE graph_edges
ADD COLUMN discovered_at timestamptz DEFAULT now(),
ADD COLUMN strength_history jsonb DEFAULT '[]'::jsonb;
```

## UI Components

### 1. Timeline Controller

```typescript
interface TimelineControllerProps {
  sessions: Session[];
  currentTime: Date;
  isPlaying: boolean;
  playbackSpeed: number;
  onTimeChange: (time: Date) => void;
  onPlayPause: () => void;
  onSpeedChange: (speed: number) => void;
}

export function TimelineController({ 
  sessions, 
  currentTime, 
  isPlaying,
  playbackSpeed,
  onTimeChange,
  onPlayPause,
  onSpeedChange
}: TimelineControllerProps) {
  return (
    <div className="timeline-controller">
      <PlayPauseButton isPlaying={isPlaying} onClick={onPlayPause} />
      
      <TimelineSlider
        min={sessions[0]?.created_at}
        max={new Date()}
        value={currentTime}
        markers={sessions}
        onChange={onTimeChange}
      />
      
      <SpeedSelector 
        value={playbackSpeed}
        options={[0.5, 1, 2, 5]}
        onChange={onSpeedChange}
      />
      
      <TimeDisplay current={currentTime} />
    </div>
  );
}
```

### 2. Temporal Graph Canvas

Enhanced Cytoscape configuration for temporal visualization:

```typescript
// Temporal styling based on time
const getTemporalNodeStyle = (node: any, currentTime: Date) => {
  const nodeTime = new Date(node.data('created_at'));
  const age = currentTime.getTime() - nodeTime.getTime();
  const hoursSinceCreation = age / (1000 * 60 * 60);
  
  if (nodeTime > currentTime) {
    // Future node (ghost preview)
    return {
      opacity: 0.3,
      'border-style': 'dashed',
      'background-color': '#gray'
    };
  } else if (hoursSinceCreation < 1) {
    // Recently created (highlight)
    return {
      opacity: 1,
      'border-width': 4,
      'border-color': '#gold',
      'background-color': node.data('color')
    };
  } else {
    // Normal node with age-based fading
    const opacity = Math.max(0.5, 1 - (hoursSinceCreation / 168)); // Fade over a week
    return {
      opacity,
      'background-color': node.data('color')
    };
  }
};
```

### 3. Session Navigator

```typescript
interface SessionNavigatorProps {
  sessions: Session[];
  currentSession: Session | null;
  onSessionSelect: (session: Session) => void;
}

export function SessionNavigator({ sessions, currentSession, onSessionSelect }: SessionNavigatorProps) {
  return (
    <div className="session-navigator">
      {sessions.map((session) => (
        <SessionCard
          key={session.id}
          session={session}
          isActive={session.id === currentSession?.id}
          onClick={() => onSessionSelect(session)}
          preview={getSessionPreview(session)}
        />
      ))}
    </div>
  );
}
```

### 4. Evolution Panel

Shows how a specific node has changed over time:

```typescript
interface NodeEvolutionPanelProps {
  node: GraphNode;
  events: GraphEvent[];
  sessions: Session[];
}

export function NodeEvolutionPanel({ node, events, sessions }: NodeEvolutionPanelProps) {
  const timeline = buildNodeTimeline(node, events, sessions);
  
  return (
    <div className="node-evolution-panel">
      <h3>{node.label} Evolution</h3>
      
      <ProgressChart 
        data={timeline.progressHistory}
        sessions={sessions}
      />
      
      <EmotionTimeline
        emotions={timeline.emotions}
        sessions={sessions}
      />
      
      <ChangeLog
        events={events}
        format="compact"
      />
    </div>
  );
}
```

## Visual Effects and Animations

### 1. Node Appearance Animation
```css
@keyframes nodeAppear {
  from {
    transform: scale(0);
    opacity: 0;
  }
  to {
    transform: scale(1);
    opacity: 1;
  }
}

.temporal-node-new {
  animation: nodeAppear 0.5s ease-out;
}
```

### 2. Edge Formation Animation
Edges gradually form between nodes:
```typescript
cy.edges().forEach(edge => {
  const formation = getEdgeFormationProgress(edge, currentTime);
  edge.style({
    'line-dash-offset': 100 - (formation * 100),
    'line-dash-pattern': [5, 5]
  });
});
```

### 3. Highlight Recent Changes
```typescript
const highlightRecentChanges = (cy: Core, since: Date) => {
  cy.elements().forEach(ele => {
    const lastModified = new Date(ele.data('updated_at'));
    if (lastModified > since) {
      ele.addClass('recently-modified');
    }
  });
};
```

## Playback Modes

### 1. Continuous Playback
Smoothly animate through time:
```typescript
const playbackLoop = () => {
  if (!isPlaying) return;
  
  currentTime.setMinutes(currentTime.getMinutes() + playbackSpeed);
  updateGraphForTime(currentTime);
  
  requestAnimationFrame(playbackLoop);
};
```

### 2. Session-by-Session
Jump between coaching sessions:
```typescript
const jumpToSession = (session: Session) => {
  currentTime = session.created_at;
  highlightSessionNodes(session.id);
  updateGraphForTime(currentTime);
};
```

### 3. Diff Mode
Compare two time periods:
```typescript
const showDiff = (time1: Date, time2: Date) => {
  const snapshot1 = getGraphSnapshot(time1);
  const snapshot2 = getGraphSnapshot(time2);
  
  const diff = computeGraphDiff(snapshot1, snapshot2);
  visualizeDiff(diff);
};
```

## Implementation Phases

### Phase 1: Data Model (Week 1)
- [ ] Create graph_events table
- [ ] Update existing tables with temporal fields
- [ ] Modify edge functions to record events
- [ ] Create event aggregation functions

### Phase 2: Basic Timeline (Week 2)
- [ ] Implement TimelineController component
- [ ] Add time-based filtering to GraphCanvas
- [ ] Create session markers on timeline
- [ ] Basic play/pause functionality

### Phase 3: Visual Polish (Week 3)
- [ ] Add appearance/disappearance animations
- [ ] Implement node aging effects
- [ ] Create highlight system for changes
- [ ] Add trail effects for node evolution

### Phase 4: Advanced Features (Week 4)
- [ ] Session navigator with previews
- [ ] Node evolution panel
- [ ] Diff comparison mode
- [ ] Export temporal visualizations

## Performance Considerations

### 1. Efficient Event Queries
```sql
-- Materialized view for fast timeline access
CREATE MATERIALIZED VIEW user_timeline AS
SELECT 
  user_id,
  date_trunc('hour', created_at) as time_bucket,
  COUNT(*) as event_count,
  jsonb_agg(DISTINCT session_id) as sessions
FROM graph_events
GROUP BY user_id, time_bucket;
```

### 2. Viewport Culling
Only render nodes visible in current time window:
```typescript
const getVisibleNodes = (nodes: any[], timeWindow: TimeWindow) => {
  return nodes.filter(node => {
    const nodeTime = new Date(node.created_at);
    return nodeTime >= timeWindow.start && nodeTime <= timeWindow.end;
  });
};
```

### 3. Level of Detail
Reduce detail for large time spans:
```typescript
const getDetailLevel = (timeSpan: number) => {
  const days = timeSpan / (1000 * 60 * 60 * 24);
  if (days > 30) return 'low';    // Monthly summary
  if (days > 7) return 'medium';  // Weekly detail
  return 'high';                  // Full detail
};
```

## Future Enhancements

1. **Pattern Detection**
   - Identify recurring themes across sessions
   - Highlight cycles in emotional states
   - Show goal achievement patterns

2. **Predictive Visualization**
   - Extrapolate future states based on trends
   - Show projected goal completion
   - Suggest optimal session timing

3. **Collaborative Timeline**
   - Compare progress with anonymized peers
   - Show common patterns in similar journeys
   - Enable coach annotations on timeline

4. **Export and Sharing**
   - Generate timeline videos
   - Create progress reports
   - Share specific time periods

## Technical Dependencies

- Cytoscape.js (existing)
- date-fns for time manipulation
- framer-motion for smooth animations
- react-use for animation hooks
- d3-scale for timeline scaling

## Conclusion

This temporal graph visualization will transform LiveGuide from a static knowledge management tool into a dynamic journey tracker, providing users with powerful insights into their personal growth over time.