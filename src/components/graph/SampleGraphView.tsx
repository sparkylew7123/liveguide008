'use client';

import React from 'react';
import GraphCanvasSimple from './GraphCanvasSimple';
import { cn } from '@/lib/utils';

interface SampleGraphViewProps {
  className?: string;
}

// Sample data showing various relationships in the graph
const SAMPLE_NODES = [
  {
    data: {
      id: 'goal-1',
      label: 'Learn Web Development',
      type: 'goal',
      description: 'Master modern web development technologies',
      status: 'curated'
    }
  },
  {
    data: {
      id: 'goal-2',
      label: 'Build a SaaS Product',
      type: 'goal',
      description: 'Create and launch a successful SaaS application',
      status: 'curated'
    }
  },
  {
    data: {
      id: 'skill-1',
      label: 'React',
      type: 'skill',
      description: 'React.js framework for building user interfaces',
      status: 'curated'
    }
  },
  {
    data: {
      id: 'skill-2',
      label: 'TypeScript',
      type: 'skill',
      description: 'Typed superset of JavaScript',
      status: 'curated'
    }
  },
  {
    data: {
      id: 'skill-3',
      label: 'Node.js',
      type: 'skill',
      description: 'JavaScript runtime for server-side development',
      status: 'curated'
    }
  },
  {
    data: {
      id: 'emotion-1',
      label: 'Excited',
      type: 'emotion',
      description: 'Feeling enthusiastic about learning new technologies',
      status: 'draft_verbal'
    }
  },
  {
    data: {
      id: 'emotion-2',
      label: 'Challenged',
      type: 'emotion',
      description: 'Feeling stretched by complex concepts',
      status: 'draft_verbal'
    }
  },
  {
    data: {
      id: 'session-1',
      label: 'React Tutorial Session',
      type: 'session',
      description: 'Completed React fundamentals tutorial',
      status: 'curated'
    }
  },
  {
    data: {
      id: 'session-2',
      label: 'Database Design Workshop',
      type: 'session',
      description: 'Learned PostgreSQL and database normalization',
      status: 'curated'
    }
  },
  {
    data: {
      id: 'accomplishment-1',
      label: 'Built Todo App',
      type: 'accomplishment',
      description: 'Successfully created a full-stack todo application',
      status: 'curated'
    }
  },
  {
    data: {
      id: 'accomplishment-2',
      label: 'Deployed to Production',
      type: 'accomplishment',
      description: 'Deployed first application to Vercel',
      status: 'curated'
    }
  }
];

const SAMPLE_EDGES = [
  // Goals work on skills
  {
    data: {
      id: 'edge-1',
      source: 'goal-1',
      target: 'skill-1',
      type: 'works_on',
      label: 'requires'
    }
  },
  {
    data: {
      id: 'edge-2',
      source: 'goal-1',
      target: 'skill-2',
      type: 'works_on',
      label: 'requires'
    }
  },
  {
    data: {
      id: 'edge-3',
      source: 'goal-2',
      target: 'skill-3',
      type: 'works_on',
      label: 'requires'
    }
  },
  // Sessions develop skills
  {
    data: {
      id: 'edge-4',
      source: 'session-1',
      target: 'skill-1',
      type: 'has_skill',
      label: 'develops'
    }
  },
  {
    data: {
      id: 'edge-5',
      source: 'session-2',
      target: 'skill-3',
      type: 'has_skill',
      label: 'develops'
    }
  },
  // Emotions connected to sessions
  {
    data: {
      id: 'edge-6',
      source: 'session-1',
      target: 'emotion-1',
      type: 'feels',
      label: 'felt'
    }
  },
  {
    data: {
      id: 'edge-7',
      source: 'session-2',
      target: 'emotion-2',
      type: 'feels',
      label: 'felt'
    }
  },
  // Accomplishments achieve goals
  {
    data: {
      id: 'edge-8',
      source: 'accomplishment-1',
      target: 'goal-1',
      type: 'achieves',
      label: 'contributes to'
    }
  },
  {
    data: {
      id: 'edge-9',
      source: 'accomplishment-2',
      target: 'goal-2',
      type: 'achieves',
      label: 'contributes to'
    }
  },
  // Accomplishments derived from sessions
  {
    data: {
      id: 'edge-10',
      source: 'accomplishment-1',
      target: 'session-1',
      type: 'derived_from',
      label: 'resulted from'
    }
  }
];

export default function SampleGraphView({ className }: SampleGraphViewProps) {
  const handleNodeClick = (nodeData: any) => {
    console.log('Sample node clicked:', nodeData);
  };

  const handleEdgeClick = (edgeData: any) => {
    console.log('Sample edge clicked:', edgeData);
  };

  return (
    <div className={cn("relative w-full h-full", className)}>
      <GraphCanvasSimple
        nodes={SAMPLE_NODES}
        edges={SAMPLE_EDGES}
        onNodeClick={handleNodeClick}
        onEdgeClick={handleEdgeClick}
        className="absolute inset-0"
      />
      
      {/* Legend */}
      <div className="absolute bottom-4 left-4 bg-white dark:bg-gray-800 rounded-lg shadow-lg p-4">
        <h3 className="text-sm font-semibold mb-2 text-gray-900 dark:text-white">Graph Legend</h3>
        <div className="space-y-1 text-xs">
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded-full bg-blue-500"></div>
            <span className="text-gray-700 dark:text-gray-300">Goals</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded-full bg-green-500"></div>
            <span className="text-gray-700 dark:text-gray-300">Skills</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded-full bg-purple-500"></div>
            <span className="text-gray-700 dark:text-gray-300">Emotions</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded-full bg-orange-500"></div>
            <span className="text-gray-700 dark:text-gray-300">Sessions</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded-full bg-yellow-500"></div>
            <span className="text-gray-700 dark:text-gray-300">Accomplishments</span>
          </div>
        </div>
      </div>
      
      {/* Info Panel */}
      <div className="absolute top-4 right-4 bg-white dark:bg-gray-800 rounded-lg shadow-lg p-4 max-w-sm">
        <h3 className="text-sm font-semibold mb-2 text-gray-900 dark:text-white">Sample Graph Overview</h3>
        <p className="text-xs text-gray-600 dark:text-gray-400 mb-2">
          This sample graph demonstrates how different elements in your knowledge graph connect:
        </p>
        <ul className="text-xs text-gray-600 dark:text-gray-400 space-y-1 list-disc list-inside">
          <li><strong>Goals</strong> require specific <strong>Skills</strong></li>
          <li><strong>Sessions</strong> help develop <strong>Skills</strong></li>
          <li><strong>Emotions</strong> are felt during <strong>Sessions</strong></li>
          <li><strong>Accomplishments</strong> contribute to achieving <strong>Goals</strong></li>
          <li>Everything is interconnected to show your learning journey</li>
        </ul>
      </div>
    </div>
  );
}