"use client";

import { useState } from "react";
import { AgentSelectionInterfaceFeminine } from "@/components/AgentSelectionInterfaceFeminine";
import { AgentSelectionInterfaceRedesigned } from "@/components/AgentSelectionInterfaceRedesigned";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";

export default function AgentSelectionDemo() {
  const [showRedesigned, setShowRedesigned] = useState(true);
  const [selectedTheme, setSelectedTheme] = useState<'rose-quartz' | 'lavender' | 'peachy' | 'mauve'>('rose-quartz');

  const handleAgentSelect = (agentId: string, elevenLabsId: string) => {
    console.log('Agent selected:', { agentId, elevenLabsId });
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Control Panel */}
      <div className="sticky top-0 z-40 bg-white border-b shadow-sm">
        <div className="max-w-7xl mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <h1 className="text-lg font-semibold">Agent Selection Interface Comparison</h1>
              <div className="flex gap-2">
                <Button
                  size="sm"
                  variant={showRedesigned ? "default" : "outline"}
                  onClick={() => setShowRedesigned(true)}
                >
                  Redesigned
                </Button>
                <Button
                  size="sm"
                  variant={!showRedesigned ? "default" : "outline"}
                  onClick={() => setShowRedesigned(false)}
                >
                  Original
                </Button>
              </div>
            </div>
            
            {/* Theme Selector */}
            <div className="flex items-center gap-2">
              <span className="text-sm text-gray-600">Theme:</span>
              <select
                value={selectedTheme}
                onChange={(e) => setSelectedTheme(e.target.value as 'rose-quartz' | 'lavender' | 'peachy' | 'mauve')}
                className="text-sm border rounded px-2 py-1"
              >
                <option value="rose-quartz">Rose Quartz</option>
                <option value="lavender">Lavender</option>
                <option value="peachy">Peachy</option>
                <option value="mauve">Mauve</option>
              </select>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="py-8">
        {showRedesigned ? (
          <>
            <div className="max-w-7xl mx-auto px-4 mb-6">
              <Card className="p-6 bg-blue-50/50 border-blue-200">
                <h2 className="text-lg font-semibold text-blue-900 mb-2">Redesigned Version</h2>
                <div className="space-y-2 text-sm text-blue-800">
                  <p>✓ Improved readability with better typography hierarchy</p>
                  <p>✓ Reduced cognitive load through progressive disclosure</p>
                  <p>✓ Enhanced mobile responsiveness with flexible heights</p>
                  <p>✓ Better visual organization using shadcn/UI components</p>
                  <p>✓ Accessibility improvements with proper contrast ratios</p>
                </div>
              </Card>
            </div>
            <AgentSelectionInterfaceRedesigned
              onAgentSelect={handleAgentSelect}
              theme={selectedTheme}
              enableAnimations={true}
            />
          </>
        ) : (
          <>
            <div className="max-w-7xl mx-auto px-4 mb-6">
              <Card className="p-6 bg-orange-50/50 border-orange-200">
                <h2 className="text-lg font-semibold text-orange-900 mb-2">Original Version</h2>
                <div className="space-y-2 text-sm text-orange-800">
                  <p>• Fixed height cards (720px) causing content overflow</p>
                  <p>• Dense information layout without clear hierarchy</p>
                  <p>• Complex animations that may distract from content</p>
                  <p>• Limited use of semantic UI components</p>
                  <p>• Accessibility concerns with low contrast text</p>
                </div>
              </Card>
            </div>
            <AgentSelectionInterfaceFeminine
              onAgentSelect={handleAgentSelect}
              theme={selectedTheme}
              enableAnimations={true}
            />
          </>
        )}
      </div>
    </div>
  );
}