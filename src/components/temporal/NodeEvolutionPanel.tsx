import React, { useState, useEffect } from 'react';
import { TemporalNode, NodeEvolution, Session } from '@/types/temporal';
import { 
  ArrowTrendingUpIcon, 
  RectangleGroupIcon, 
  ClockIcon, 
  XMarkIcon, 
  ChevronDownIcon, 
  ChevronRightIcon 
} from '@heroicons/react/24/outline';
import { format, formatDistanceToNow } from 'date-fns';

interface NodeEvolutionPanelProps {
  node: TemporalNode;
  sessions: Session[];
  onClose: () => void;
  getNodeEvolution: (nodeId: string) => Promise<NodeEvolution[]>;
}

export function NodeEvolutionPanel({
  node,
  sessions,
  onClose,
  getNodeEvolution
}: NodeEvolutionPanelProps) {
  const [evolution, setEvolution] = useState<NodeEvolution[]>([]);
  const [loading, setLoading] = useState(true);
  const [expandedEvents, setExpandedEvents] = useState<Set<string>>(new Set());

  useEffect(() => {
    const loadEvolution = async () => {
      setLoading(true);
      try {
        const data = await getNodeEvolution(node.id);
        setEvolution(data);
      } catch (error) {
        console.error('Failed to load node evolution:', error);
      }
      setLoading(false);
    };

    loadEvolution();
  }, [node.id, getNodeEvolution]);

  const toggleEventExpansion = (eventId: string) => {
    setExpandedEvents(prev => {
      const next = new Set(prev);
      if (next.has(eventId)) {
        next.delete(eventId);
      } else {
        next.add(eventId);
      }
      return next;
    });
  };

  const getEventIcon = (eventType: string) => {
    switch (eventType) {
      case 'node_created':
        return <RectangleGroupIcon className="w-4 h-4 text-green-500" />;
      case 'node_updated':
        return <ArrowTrendingUpIcon className="w-4 h-4 text-blue-500" />;
      case 'status_changed':
        return <ClockIcon className="w-4 h-4 text-purple-500" />;
      default:
        return <ClockIcon className="w-4 h-4 text-muted-foreground" />;
    }
  };

  const getSessionForEvent = (sessionId?: string) => {
    if (!sessionId) return null;
    return sessions.find(s => s.id === sessionId);
  };

  const formatChanges = (changes: Record<string, { old: any; new: any }>) => {
    return Object.entries(changes).map(([key, value]) => ({
      field: key,
      old: value.old,
      new: value.new
    }));
  };

  return (
    <div className="bg-background/95 backdrop-blur-lg border rounded-lg shadow-lg">
      <div className="flex items-center justify-between p-4 border-b">
        <div>
          <h3 className="font-medium">{node.label} Evolution</h3>
          <p className="text-xs text-muted-foreground mt-1">
            Tracking changes over time
          </p>
        </div>
        <button
          onClick={onClose}
          className="p-1 rounded hover:bg-muted transition-colors"
        >
          <XMarkIcon className="w-4 h-4" />
        </button>
      </div>

      <div className="p-4">
        {/* Node Summary */}
        <div className="mb-4 p-3 bg-muted/50 rounded-lg">
          <div className="grid grid-cols-2 gap-2 text-sm">
            <div>
              <span className="text-muted-foreground">Type:</span>
              <span className="ml-2 font-medium">{node.node_type}</span>
            </div>
            <div>
              <span className="text-muted-foreground">Status:</span>
              <span className="ml-2 font-medium">{node.status || 'N/A'}</span>
            </div>
            <div>
              <span className="text-muted-foreground">Created:</span>
              <span className="ml-2 font-medium">
                {formatDistanceToNow(new Date(node.created_at), { addSuffix: true })}
              </span>
            </div>
            <div>
              <span className="text-muted-foreground">Sessions:</span>
              <span className="ml-2 font-medium">
                {node.session_mentions?.length || 0}
              </span>
            </div>
          </div>
        </div>

        {/* Evolution Timeline */}
        <div className="space-y-2">
          <h4 className="text-sm font-medium mb-2">Change History</h4>
          
          {loading ? (
            <div className="text-center py-8 text-muted-foreground">
              Loading evolution history...
            </div>
          ) : evolution.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              No changes recorded yet
            </div>
          ) : (
            <div className="space-y-2 max-h-[40vh] overflow-y-auto">
              {evolution.map((event) => {
                const isExpanded = expandedEvents.has(event.event_id);
                const session = getSessionForEvent(event.session_id);
                const changes = event.changes ? formatChanges(event.changes) : [];
                const eventTime = new Date(event.event_timestamp);

                return (
                  <div
                    key={event.event_id}
                    className="border rounded-lg p-3 hover:bg-muted/30 transition-colors"
                  >
                    <button
                      onClick={() => toggleEventExpansion(event.event_id)}
                      className="w-full text-left"
                    >
                      <div className="flex items-start gap-3">
                        <div className="mt-0.5">
                          {getEventIcon(event.event_type)}
                        </div>
                        
                        <div className="flex-1">
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-2">
                              <span className="text-sm font-medium">
                                {event.event_type.replace(/_/g, ' ')}
                              </span>
                              {changes.length > 0 && (
                                <span className="text-xs text-muted-foreground">
                                  ({changes.length} changes)
                                </span>
                              )}
                            </div>
                            <div className="flex items-center gap-1 text-xs text-muted-foreground">
                              {isExpanded ? <ChevronDownIcon className="w-3 h-3" /> : <ChevronRightIcon className="w-3 h-3" />}
                              {format(eventTime, 'MMM d, h:mm a')}
                            </div>
                          </div>

                          {session && (
                            <div className="text-xs text-muted-foreground mt-1">
                              During: {session.label}
                            </div>
                          )}
                        </div>
                      </div>
                    </button>

                    {isExpanded && changes.length > 0 && (
                      <div className="mt-3 pl-7 space-y-2">
                        {changes.map((change, idx) => (
                          <div key={idx} className="text-xs space-y-1">
                            <div className="font-medium text-muted-foreground">
                              {change.field}:
                            </div>
                            <div className="pl-3 space-y-0.5">
                              {change.old !== null && change.old !== undefined && (
                                <div className="text-red-600">
                                  - {JSON.stringify(change.old)}
                                </div>
                              )}
                              <div className="text-green-600">
                                + {JSON.stringify(change.new)}
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}

                    {isExpanded && event.metadata && Object.keys(event.metadata).length > 0 && (
                      <div className="mt-3 pl-7">
                        <div className="text-xs text-muted-foreground">
                          Metadata:
                          <pre className="mt-1 p-2 bg-muted/50 rounded text-xs overflow-x-auto">
                            {JSON.stringify(event.metadata, null, 2)}
                          </pre>
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Progress Chart Placeholder */}
        {node.properties?.progress !== undefined && (
          <div className="mt-4 p-3 bg-muted/50 rounded-lg">
            <h4 className="text-sm font-medium mb-2">Progress Over Time</h4>
            <div className="h-32 flex items-center justify-center text-muted-foreground text-sm">
              Progress visualization coming soon...
            </div>
          </div>
        )}
      </div>
    </div>
  );
}