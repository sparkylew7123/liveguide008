'use client';

import React from 'react';
import { 
  ArrowsPointingOutIcon, 
  ArrowsPointingInIcon,
  ArrowPathIcon,
  PlusIcon,
  MagnifyingGlassIcon,
  AdjustmentsHorizontalIcon,
  DocumentArrowDownIcon
} from '@heroicons/react/24/outline';
import { Button } from '@/components/ui/button';
import { 
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
  DropdownMenuCheckboxItem
} from '@/components/ui/dropdown-menu';
import { Input } from '@/components/ui/input';
import { cn } from '@/lib/utils';

interface GraphToolbarProps {
  onZoomIn: () => void;
  onZoomOut: () => void;
  onResetView: () => void;
  onAddNode: () => void;
  onSearch: (query: string) => void;
  onLayoutChange: (layout: string) => void;
  onExport: () => void;
  nodeTypeFilters: string[];
  onNodeTypeFilterChange: (types: string[]) => void;
  className?: string;
}

const NODE_TYPES = [
  { value: 'goal', label: 'Goals', icon: '🎯' },
  { value: 'skill', label: 'Skills', icon: '🎓' },
  { value: 'emotion', label: 'Emotions', icon: '💭' },
  { value: 'session', label: 'Sessions', icon: '⏱️' },
  { value: 'accomplishment', label: 'Accomplishments', icon: '🏆' }
];

const LAYOUT_OPTIONS = [
  { value: 'fcose', label: 'Force-Directed' },
  { value: 'cola', label: 'Cola' },
  { value: 'circle', label: 'Circle' },
  { value: 'grid', label: 'Grid' },
  { value: 'concentric', label: 'Concentric' }
];

export default function GraphToolbar({
  onZoomIn,
  onZoomOut,
  onResetView,
  onAddNode,
  onSearch,
  onLayoutChange,
  onExport,
  nodeTypeFilters,
  onNodeTypeFilterChange,
  className
}: GraphToolbarProps) {
  const [searchQuery, setSearchQuery] = React.useState('');
  const [showSearch, setShowSearch] = React.useState(false);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    onSearch(searchQuery);
  };

  const toggleNodeType = (type: string) => {
    if (nodeTypeFilters.includes(type)) {
      onNodeTypeFilterChange(nodeTypeFilters.filter(t => t !== type));
    } else {
      onNodeTypeFilterChange([...nodeTypeFilters, type]);
    }
  };

  return (
    <div className={cn(
      "absolute top-4 right-4 z-10",
      "flex flex-col gap-2",
      className
    )}>
      {/* Search Bar */}
      {showSearch && (
        <form 
          onSubmit={handleSearch}
          className="bg-white dark:bg-gray-800 rounded-lg shadow-lg p-2 flex gap-2"
        >
          <Input
            type="text"
            placeholder="Search nodes..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-48"
          />
          <Button type="submit" size="sm">
            Search
          </Button>
        </form>
      )}

      {/* Main Toolbar */}
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg p-2 flex flex-col gap-2">
        {/* Zoom Controls */}
        <div className="flex gap-1">
          <Button
            variant="ghost"
            size="icon"
            onClick={onZoomIn}
            title="Zoom In"
          >
            <ArrowsPointingOutIcon className="w-4 h-4" />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            onClick={onZoomOut}
            title="Zoom Out"
          >
            <ArrowsPointingInIcon className="w-4 h-4" />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            onClick={onResetView}
            title="Reset View"
          >
            <ArrowPathIcon className="w-4 h-4" />
          </Button>
        </div>

        <div className="w-full h-px bg-gray-200 dark:bg-gray-700" />

        {/* Action Controls */}
        <div className="flex gap-1">
          <Button
            variant="ghost"
            size="icon"
            onClick={onAddNode}
            title="Add Node"
          >
            <PlusIcon className="w-4 h-4" />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setShowSearch(!showSearch)}
            title="Search"
          >
            <MagnifyingGlassIcon className="w-4 h-4" />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            onClick={onExport}
            title="Export Graph"
          >
            <DocumentArrowDownIcon className="w-4 h-4" />
          </Button>
        </div>

        <div className="w-full h-px bg-gray-200 dark:bg-gray-700" />

        {/* Layout & Filters */}
        <div className="flex gap-1">
          {/* Layout Dropdown */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon" title="Change Layout">
                <AdjustmentsHorizontalIcon className="w-4 h-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-48">
              <DropdownMenuLabel>Graph Layout</DropdownMenuLabel>
              <DropdownMenuSeparator />
              {LAYOUT_OPTIONS.map((layout) => (
                <DropdownMenuItem
                  key={layout.value}
                  onClick={() => onLayoutChange(layout.value)}
                >
                  {layout.label}
                </DropdownMenuItem>
              ))}
            </DropdownMenuContent>
          </DropdownMenu>

          {/* Node Type Filter */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon" title="Filter Nodes">
                <span className="text-xs">
                  {nodeTypeFilters.length === NODE_TYPES.length ? 'All' : nodeTypeFilters.length}
                </span>
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-56">
              <DropdownMenuLabel>Show Node Types</DropdownMenuLabel>
              <DropdownMenuSeparator />
              {NODE_TYPES.map((type) => (
                <DropdownMenuCheckboxItem
                  key={type.value}
                  checked={nodeTypeFilters.includes(type.value)}
                  onCheckedChange={() => toggleNodeType(type.value)}
                >
                  <span className="mr-2">{type.icon}</span>
                  {type.label}
                </DropdownMenuCheckboxItem>
              ))}
              <DropdownMenuSeparator />
              <DropdownMenuItem
                onClick={() => onNodeTypeFilterChange(NODE_TYPES.map(t => t.value))}
              >
                Select All
              </DropdownMenuItem>
              <DropdownMenuItem
                onClick={() => onNodeTypeFilterChange([])}
              >
                Clear All
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>
    </div>
  );
}