'use client';

import React from 'react';
import { XMarkIcon, PencilIcon, TrashIcon, LinkIcon } from '@heroicons/react/24/outline';
import { CheckIcon, ClockIcon } from '@heroicons/react/24/solid';
import { Button } from '@/components/ui/button';
import { Card, CardHeader, CardContent, CardFooter } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { cn } from '@/lib/utils';

interface NodeDetailsPanelProps {
  node: any | null;
  onClose: () => void;
  onUpdate: (nodeId: string, updates: any) => void;
  onDelete: (nodeId: string) => void;
  onCreateEdge: (sourceNodeId: string) => void;
  className?: string;
}

export default function NodeDetailsPanel({
  node,
  onClose,
  onUpdate,
  onDelete,
  onCreateEdge,
  className
}: NodeDetailsPanelProps) {
  const [isEditing, setIsEditing] = React.useState(false);
  const [editedNode, setEditedNode] = React.useState(node);

  React.useEffect(() => {
    setEditedNode(node);
    setIsEditing(false);
  }, [node]);

  if (!node) {
    return null;
  }

  const handleSave = () => {
    const updates: any = {};
    
    if (editedNode.label !== node.label) {
      updates.label = editedNode.label;
    }
    
    if (editedNode.description !== node.description) {
      updates.description = editedNode.description;
    }
    
    if (node.status === 'draft_verbal') {
      updates.status = 'curated';
    }

    onUpdate(node.id, updates);
    setIsEditing(false);
  };

  const getNodeTypeColor = (type: string) => {
    const colors = {
      goal: 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-100',
      skill: 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900 dark:text-emerald-100',
      emotion: 'bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-100',
      session: 'bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-100',
      accomplishment: 'bg-amber-100 text-amber-800 dark:bg-amber-900 dark:text-amber-100',
      insight: 'bg-cyan-100 text-cyan-800 dark:bg-cyan-900 dark:text-cyan-100'
    };
    return colors[type as keyof typeof colors] || 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-100';
  };

  const getNodeTypeIcon = (type: string) => {
    const icons = {
      goal: '🎯',
      skill: '🎓',
      emotion: '💭',
      session: '⏱️',
      accomplishment: '🏆',
      insight: '💡'
    };
    return icons[type as keyof typeof icons] || '📌';
  };

  return (
    <Card className={cn("h-full flex flex-col", className)}>
      <CardHeader className="flex-shrink-0">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="text-2xl">{getNodeTypeIcon(node.type)}</span>
            <Badge className={getNodeTypeColor(node.type)}>
              {node.type}
            </Badge>
            {node.status === 'draft_verbal' ? (
              <Badge variant="secondary" className="opacity-70">
                <ClockIcon className="w-3 h-3 mr-1" />
                Draft
              </Badge>
            ) : (
              <Badge className="bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-100">
                <CheckIcon className="w-3 h-3 mr-1" />
                Confirmed
              </Badge>
            )}
          </div>
          <Button variant="ghost" size="icon" onClick={onClose}>
            <XMarkIcon className="w-4 h-4" />
          </Button>
        </div>
      </CardHeader>

      <Separator />

      <CardContent className="flex-1 overflow-y-auto p-6">
        {isEditing ? (
          <div className="space-y-4">
            <div>
              <Label htmlFor="node-label">Label</Label>
              <Input
                id="node-label"
                value={editedNode?.label || ''}
                onChange={(e) => setEditedNode({ ...editedNode, label: e.target.value })}
                placeholder="Enter node label"
                className="mt-1"
              />
            </div>
            <div>
              <Label htmlFor="node-description">Description</Label>
              <Textarea
                id="node-description"
                value={editedNode?.description || ''}
                onChange={(e) => setEditedNode({ ...editedNode, description: e.target.value })}
                placeholder="Enter node description"
                className="mt-1"
                rows={4}
              />
            </div>
          </div>
        ) : (
          <div className="space-y-4">
            <div>
              <h3 className="text-lg font-semibold">{node.label}</h3>
              {node.description && (
                <p className="text-sm text-gray-600 dark:text-gray-400 mt-2">
                  {node.description}
                </p>
              )}
            </div>

            {node.properties && Object.keys(node.properties).length > 0 && (
              <>
                <Separator />
                <div>
                  <h4 className="text-sm font-medium mb-2">Properties</h4>
                  <div className="space-y-2">
                    {Object.entries(node.properties).map(([key, value]) => (
                      <div key={key} className="flex justify-between text-sm">
                        <span className="text-gray-600 dark:text-gray-400">
                          {key.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())}:
                        </span>
                        <span className="font-medium">
                          {value === null || value === undefined 
                            ? 'Not set' 
                            : typeof value === 'object' 
                              ? JSON.stringify(value, null, 2) 
                              : String(value)}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              </>
            )}

            <Separator />

            <div className="text-xs text-gray-500 dark:text-gray-400 space-y-1">
              <div>
                Created: {node.createdAt || node.created_at 
                  ? new Date(node.createdAt || node.created_at).toLocaleDateString('en-US', {
                      year: 'numeric',
                      month: 'short',
                      day: 'numeric',
                      hour: '2-digit',
                      minute: '2-digit'
                    })
                  : 'Unknown'
                }
              </div>
              {(node.updatedAt || node.updated_at) && (
                <div>
                  Updated: {new Date(node.updatedAt || node.updated_at).toLocaleDateString('en-US', {
                    year: 'numeric',
                    month: 'short',
                    day: 'numeric',
                    hour: '2-digit',
                    minute: '2-digit'
                  })}
                </div>
              )}
            </div>
          </div>
        )}
      </CardContent>

      <Separator />

      <CardFooter className="flex-shrink-0 flex justify-between p-4">
        {isEditing ? (
          <>
            <Button variant="outline" onClick={() => setIsEditing(false)}>
              Cancel
            </Button>
            <Button onClick={handleSave}>
              Save Changes
            </Button>
          </>
        ) : (
          <>
            <div className="flex gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setIsEditing(true)}
              >
                <PencilIcon className="w-4 h-4 mr-1" />
                Edit
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => onCreateEdge(node.id)}
              >
                <LinkIcon className="w-4 h-4 mr-1" />
                Link
              </Button>
            </div>
            <Button
              variant="destructive"
              size="sm"
              onClick={() => {
                if (confirm('Are you sure you want to delete this node?')) {
                  onDelete(node.id);
                }
              }}
            >
              <TrashIcon className="w-4 h-4 mr-1" />
              Delete
            </Button>
          </>
        )}
      </CardFooter>
    </Card>
  );
}