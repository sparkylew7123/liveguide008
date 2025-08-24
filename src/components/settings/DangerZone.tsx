'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { ExclamationTriangleIcon } from '@heroicons/react/24/outline';
import { createClient } from '@/utils/supabase/client';
import { useUser } from '@/contexts/UserContext';

export default function DangerZone() {
  const router = useRouter();
  const { user } = useUser();
  const supabase = createClient();
  const [showConfirmDialog, setShowConfirmDialog] = useState(false);
  const [showPreview, setShowPreview] = useState(false);
  const [confirmText, setConfirmText] = useState('');
  const [isDeleting, setIsDeleting] = useState(false);
  const [previewData, setPreviewData] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);

  const handlePreviewReset = async () => {
    if (!user) return;
    
    setError(null);
    try {
      const { data, error } = await supabase.rpc('api_get_user_reset_preview');
      
      if (error) throw error;
      
      setPreviewData(data);
      setShowPreview(true);
    } catch (err: any) {
      setError(err.message || 'Failed to load data preview');
    }
  };

  const handleResetData = async () => {
    if (!user || confirmText !== 'DELETE MY DATA') return;
    
    setIsDeleting(true);
    setError(null);
    
    try {
      const { data, error } = await supabase.rpc('api_reset_user_data', {
        p_confirm_deletion: true
      });
      
      if (error) throw error;
      
      // Sign out and redirect to home
      await supabase.auth.signOut();
      router.push('/');
    } catch (err: any) {
      setError(err.message || 'Failed to reset data');
      setIsDeleting(false);
    }
  };

  return (
    <div className="bg-red-50 dark:bg-red-950/20 border border-red-200 dark:border-red-900 rounded-lg p-6">
      <div className="flex items-start space-x-3">
        <ExclamationTriangleIcon className="h-6 w-6 text-red-600 dark:text-red-400 mt-0.5" />
        <div className="flex-1">
          <h3 className="text-lg font-semibold text-red-900 dark:text-red-100 mb-2">
            Danger Zone
          </h3>
          <p className="text-sm text-red-700 dark:text-red-300 mb-4">
            These actions are permanent and cannot be undone. Please proceed with caution.
          </p>
          
          <div className="space-y-4">
            {/* Reset All Data */}
            <div className="bg-white dark:bg-gray-900 rounded-lg p-4 border border-red-200 dark:border-red-800">
              <h4 className="font-medium text-gray-900 dark:text-gray-100 mb-2">
                Reset All Data
              </h4>
              <p className="text-sm text-gray-600 dark:text-gray-400 mb-3">
                This will permanently delete all your data including:
              </p>
              <ul className="text-sm text-gray-600 dark:text-gray-400 mb-4 ml-4 list-disc">
                <li>Your knowledge graph and all nodes</li>
                <li>Goals and progress tracking</li>
                <li>Conversation history and insights</li>
                <li>Agent interactions and preferences</li>
                <li>All personal settings and customizations</li>
              </ul>
              
              <div className="flex gap-2">
                <button
                  onClick={handlePreviewReset}
                  className="px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 dark:hover:bg-gray-700 rounded-lg transition-colors"
                >
                  Preview Data
                </button>
                <button
                  onClick={() => setShowConfirmDialog(true)}
                  className="px-4 py-2 text-sm font-medium text-white bg-red-600 hover:bg-red-700 rounded-lg transition-colors"
                >
                  Reset All Data
                </button>
              </div>
            </div>
          </div>
          
          {error && (
            <div className="mt-4 p-3 bg-red-100 dark:bg-red-900/30 border border-red-200 dark:border-red-800 rounded-lg">
              <p className="text-sm text-red-700 dark:text-red-300">{error}</p>
            </div>
          )}
        </div>
      </div>

      {/* Preview Modal */}
      {showPreview && previewData && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="bg-white dark:bg-gray-900 rounded-lg max-w-2xl w-full max-h-[80vh] overflow-hidden">
            <div className="p-6 border-b border-gray-200 dark:border-gray-700">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
                Data Preview - This Will Be Deleted
              </h3>
            </div>
            
            <div className="p-6 overflow-y-auto max-h-[60vh]">
              <div className="space-y-4">
                {previewData.statistics?.map((stat: any, idx: number) => (
                  <div key={idx} className="bg-gray-50 dark:bg-gray-800 rounded-lg p-4">
                    <h4 className="font-medium text-gray-900 dark:text-gray-100 mb-2">
                      {stat.category}
                    </h4>
                    <p className="text-sm text-gray-600 dark:text-gray-400">
                      {stat.description}
                    </p>
                    <p className="text-lg font-semibold text-red-600 dark:text-red-400 mt-1">
                      {stat.total_rows} items
                    </p>
                  </div>
                ))}
              </div>
              
              {previewData.safety_check && !previewData.safety_check.safe_to_reset && (
                <div className="mt-4 p-3 bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg">
                  <p className="text-sm text-yellow-700 dark:text-yellow-300">
                    Warning: {previewData.safety_check.reason}
                  </p>
                </div>
              )}
            </div>
            
            <div className="p-6 border-t border-gray-200 dark:border-gray-700">
              <button
                onClick={() => setShowPreview(false)}
                className="px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 dark:hover:bg-gray-700 rounded-lg transition-colors"
              >
                Close Preview
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Confirmation Dialog */}
      {showConfirmDialog && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="bg-white dark:bg-gray-900 rounded-lg max-w-md w-full p-6">
            <div className="flex items-center space-x-3 mb-4">
              <ExclamationTriangleIcon className="h-8 w-8 text-red-600 dark:text-red-400" />
              <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
                Confirm Data Reset
              </h3>
            </div>
            
            <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">
              This action will permanently delete all your data. You will be signed out and your account will be reset to a fresh state.
            </p>
            
            <p className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Type <span className="font-mono text-red-600 dark:text-red-400">DELETE MY DATA</span> to confirm:
            </p>
            
            <input
              type="text"
              value={confirmText}
              onChange={(e) => setConfirmText(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-red-500 focus:border-transparent"
              placeholder="Type confirmation text"
            />
            
            <div className="flex justify-end space-x-3 mt-6">
              <button
                onClick={() => {
                  setShowConfirmDialog(false);
                  setConfirmText('');
                }}
                disabled={isDeleting}
                className="px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 dark:hover:bg-gray-700 rounded-lg transition-colors disabled:opacity-50"
              >
                Cancel
              </button>
              <button
                onClick={handleResetData}
                disabled={confirmText !== 'DELETE MY DATA' || isDeleting}
                className="px-4 py-2 text-sm font-medium text-white bg-red-600 hover:bg-red-700 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isDeleting ? 'Resetting...' : 'Delete All Data'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}