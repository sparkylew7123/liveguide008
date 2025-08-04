'use client';

import React, { useState, useRef, useEffect } from 'react';
import NodeDetailsPanel from './NodeDetailsPanel';
import { cn } from '@/lib/utils';

interface DraggableNodeDetailsProps {
  node: any | null;
  onClose: () => void;
  onUpdate: (nodeId: string, updates: any) => void;
  onDelete: (nodeId: string) => void;
  onCreateEdge: (sourceNodeId: string) => void;
  className?: string;
}

export default function DraggableNodeDetails({
  node,
  onClose,
  onUpdate,
  onDelete,
  onCreateEdge,
  className
}: DraggableNodeDetailsProps) {
  const [position, setPosition] = useState({ x: 20, y: 100 }); // Start on the left
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });
  const panelRef = useRef<HTMLDivElement>(null);

  // Reset position when a new node is selected
  useEffect(() => {
    if (node) {
      // Position on the left side of the screen
      setPosition({ x: 20, y: 100 });
    }
  }, [node?.id]);

  const handleMouseDown = (e: React.MouseEvent) => {
    // Only start drag if clicking on the header area
    const target = e.target as HTMLElement;
    if (target.closest('.drag-handle')) {
      setIsDragging(true);
      setDragStart({
        x: e.clientX - position.x,
        y: e.clientY - position.y
      });
      e.preventDefault();
    }
  };

  const handleTouchStart = (e: React.TouchEvent) => {
    const target = e.target as HTMLElement;
    if (target.closest('.drag-handle') && e.touches.length === 1) {
      const touch = e.touches[0];
      setIsDragging(true);
      setDragStart({
        x: touch.clientX - position.x,
        y: touch.clientY - position.y
      });
      e.preventDefault();
    }
  };

  const handleMouseMove = (e: MouseEvent) => {
    if (isDragging) {
      const newX = e.clientX - dragStart.x;
      const newY = e.clientY - dragStart.y;
      
      // Get viewport dimensions
      const viewportWidth = window.innerWidth;
      const viewportHeight = window.innerHeight;
      
      // Get panel dimensions
      const panelWidth = panelRef.current?.offsetWidth || 384; // w-96 = 24rem = 384px
      const panelHeight = panelRef.current?.offsetHeight || 600;
      
      // Constrain position to viewport
      const constrainedX = Math.max(0, Math.min(newX, viewportWidth - panelWidth));
      const constrainedY = Math.max(0, Math.min(newY, viewportHeight - panelHeight));
      
      setPosition({ x: constrainedX, y: constrainedY });
    }
  };

  const handleTouchMove = (e: TouchEvent) => {
    if (isDragging && e.touches.length === 1) {
      const touch = e.touches[0];
      const newX = touch.clientX - dragStart.x;
      const newY = touch.clientY - dragStart.y;
      
      // Get viewport dimensions
      const viewportWidth = window.innerWidth;
      const viewportHeight = window.innerHeight;
      
      // Get panel dimensions
      const panelWidth = panelRef.current?.offsetWidth || 384;
      const panelHeight = panelRef.current?.offsetHeight || 600;
      
      // Constrain position to viewport
      const constrainedX = Math.max(0, Math.min(newX, viewportWidth - panelWidth));
      const constrainedY = Math.max(0, Math.min(newY, viewportHeight - panelHeight));
      
      setPosition({ x: constrainedX, y: constrainedY });
    }
  };

  const handleMouseUp = () => {
    setIsDragging(false);
  };

  const handleTouchEnd = () => {
    setIsDragging(false);
  };

  useEffect(() => {
    if (isDragging) {
      document.addEventListener('mousemove', handleMouseMove);
      document.addEventListener('mouseup', handleMouseUp);
      document.addEventListener('touchmove', handleTouchMove, { passive: false });
      document.addEventListener('touchend', handleTouchEnd);
      
      return () => {
        document.removeEventListener('mousemove', handleMouseMove);
        document.removeEventListener('mouseup', handleMouseUp);
        document.removeEventListener('touchmove', handleTouchMove);
        document.removeEventListener('touchend', handleTouchEnd);
      };
    }
  }, [isDragging, dragStart]);

  if (!node) return null;

  return (
    <div
      ref={panelRef}
      className={cn(
        "absolute z-50 shadow-xl",
        "bg-white/90 dark:bg-gray-900/90 backdrop-blur-sm rounded-lg",
        // Responsive sizing
        "w-[calc(100vw-2rem)] max-w-96 h-[calc(100vh-4rem)] max-h-[600px]",
        "sm:w-96 sm:h-[600px]",
        isDragging && "cursor-grabbing",
        className
      )}
      style={{
        left: `${position.x}px`,
        top: `${position.y}px`,
        transition: isDragging ? 'none' : 'left 0.3s ease-out, top 0.3s ease-out'
      }}
      onMouseDown={handleMouseDown}
      onTouchStart={handleTouchStart}
    >
      {/* Custom header with drag handle */}
      <div className="drag-handle absolute top-0 left-0 right-0 h-14 cursor-grab bg-transparent z-10 touch-none" />
      
      <NodeDetailsPanel
        node={node}
        onClose={onClose}
        onUpdate={onUpdate}
        onDelete={onDelete}
        onCreateEdge={onCreateEdge}
        className="h-full"
      />
    </div>
  );
}