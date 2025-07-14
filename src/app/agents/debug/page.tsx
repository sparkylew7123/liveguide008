'use client';

import { useEffect, useState } from 'react';
import { createClient } from '@/utils/supabase/client';

export default function DebugAgents() {
  const [status, setStatus] = useState('Testing...');
  const [agents, setAgents] = useState<any[]>([]);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const testConnection = async () => {
      try {
        setStatus('Connecting to Supabase...');
        const supabase = createClient();
        
        setStatus('Fetching agents...');
        const { data, error } = await supabase
          .from('agent_personae')
          .select('uuid, Name, Speciality, 11labs_agentID, availability_status')
          .not('11labs_agentID', 'is', null)
          .eq('availability_status', 'available')
          .order('Name');

        if (error) {
          setError(`Supabase error: ${error.message}`);
          setStatus('Error occurred');
        } else {
          setAgents(data || []);
          setStatus(`Success! Found ${data?.length || 0} agents`);
        }
      } catch (err) {
        setError(`JavaScript error: ${err}`);
        setStatus('Error occurred');
      }
    };

    testConnection();
  }, []);

  return (
    <div className="p-8">
      <h1 className="text-2xl font-bold mb-4">Agent Debug Page</h1>
      <div className="space-y-4">
        <p><strong>Status:</strong> {status}</p>
        {error && (
          <p className="text-red-600"><strong>Error:</strong> {error}</p>
        )}
        <p><strong>Agents found:</strong> {agents.length}</p>
        {agents.length > 0 && (
          <div>
            <h3 className="font-bold">First 3 agents:</h3>
            <ul className="list-disc ml-6">
              {agents.slice(0, 3).map((agent) => (
                <li key={agent.uuid}>
                  {agent.Name} - {agent.Speciality} (ID: {agent['11labs_agentID']})
                </li>
              ))}
            </ul>
          </div>
        )}
      </div>
    </div>
  );
}