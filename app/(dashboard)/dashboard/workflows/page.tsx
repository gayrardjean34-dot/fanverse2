'use client';

import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import useSWR, { mutate } from 'swr';
import { Workflow, Zap, Loader2, Play, X, Coins } from 'lucide-react';
import { AI_PROVIDERS, PROVIDER_IDS } from '@/lib/ai/providers';

const fetcher = (url: string) => fetch(url).then((res) => res.json());

type WorkflowData = {
  id: number;
  slug: string;
  name: string;
  description: string | null;
  creditCost: number;
  allowedModels: string[] | null;
  inputSchema: Record<string, any> | null;
};

function RunModal({ workflow, onClose }: { workflow: WorkflowData; onClose: () => void }) {
  const [model, setModel] = useState('');
  const [inputs, setInputs] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<any>(null);
  const [error, setError] = useState('');

  const availableModels = workflow.allowedModels?.length
    ? PROVIDER_IDS.filter((id) => workflow.allowedModels!.includes(id))
    : PROVIDER_IDS;

  const inputFields = workflow.inputSchema
    ? Object.entries(workflow.inputSchema as Record<string, any>)
    : [];

  async function handleRun() {
    setLoading(true);
    setError('');
    setResult(null);
    try {
      const res = await fetch('/api/workflows/run', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          workflowSlug: workflow.slug,
          model: model || undefined,
          inputs: Object.keys(inputs).length > 0 ? inputs : undefined,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || 'Failed to run workflow');
      } else {
        setResult(data);
        mutate('/api/credits/balance');
        mutate('/api/workflows/runs?limit=5');
      }
    } catch (e: any) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4" onClick={onClose}>
      <div className="bg-[#222] border border-[#333] rounded-2xl max-w-lg w-full p-6" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-xl font-bold">{workflow.name}</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-white"><X className="h-5 w-5" /></button>
        </div>

        {workflow.description && <p className="text-gray-400 text-sm mb-6">{workflow.description}</p>}

        <div className="space-y-4">
          {/* Model selector */}
          <div>
            <Label className="text-gray-300 mb-2">Model</Label>
            <div className="grid grid-cols-2 gap-2 mt-1">
              {availableModels.map((id) => (
                <button
                  key={id}
                  onClick={() => setModel(id)}
                  className={`p-2 rounded-lg text-sm text-left border transition-all ${
                    model === id
                      ? 'border-[#28B8F6] bg-[#28B8F6]/10 text-[#28B8F6]'
                      : 'border-[#333] hover:border-[#444] text-gray-300'
                  }`}
                >
                  <span className="mr-1">{AI_PROVIDERS[id].icon}</span>
                  {AI_PROVIDERS[id].name}
                </button>
              ))}
            </div>
          </div>

          {/* Dynamic inputs */}
          {inputFields.map(([key, config]) => (
            <div key={key}>
              <Label className="text-gray-300 mb-1">{(config as any)?.label || key}</Label>
              <Input
                className="bg-[#2a2a2a] border-[#333] text-[#FEFEFE] mt-1"
                placeholder={(config as any)?.placeholder || `Enter ${key}`}
                value={inputs[key] || ''}
                onChange={(e) => setInputs({ ...inputs, [key]: e.target.value })}
              />
            </div>
          ))}

          <div className="flex items-center gap-2 text-sm text-gray-400">
            <Coins className="h-4 w-4" />
            Cost: <span className="text-[#28B8F6] font-semibold">{workflow.creditCost} credits</span>
          </div>

          {error && <p className="text-red-400 text-sm">{error}</p>}
          {result && (
            <div className="p-3 rounded-lg bg-green-500/10 border border-green-500/20 text-green-400 text-sm">
              ✅ Run started! ID: {result.runId}
            </div>
          )}

          <Button
            onClick={handleRun}
            disabled={loading}
            className="w-full bg-[#28B8F6] hover:bg-[#28B8F6]/80 text-[#191919] font-semibold"
          >
            {loading ? (
              <><Loader2 className="animate-spin mr-2 h-4 w-4" />Running...</>
            ) : (
              <><Play className="mr-2 h-4 w-4" />Run Workflow</>
            )}
          </Button>
        </div>
      </div>
    </div>
  );
}

export default function WorkflowsPage() {
  const { data: workflows } = useSWR<WorkflowData[]>('/api/workflows', fetcher);
  const { data: runs } = useSWR<any[]>('/api/workflows/runs?limit=20', fetcher);
  const [selectedWorkflow, setSelectedWorkflow] = useState<WorkflowData | null>(null);

  return (
    <section className="flex-1 p-4 lg:p-8">
      <h1 className="text-2xl lg:text-3xl font-bold mb-8">AI Workflows</h1>

      {/* Workflow cards */}
      <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6 mb-12">
        {(!workflows || workflows.length === 0) ? (
          <Card className="bg-[#222] border-[#333] col-span-full">
            <CardContent className="p-8 text-center">
              <Workflow className="h-12 w-12 text-gray-500 mx-auto mb-4" />
              <p className="text-gray-400">No workflows available yet. Check back soon!</p>
            </CardContent>
          </Card>
        ) : (
          workflows.map((wf) => (
            <Card key={wf.id} className="bg-[#222] border-[#333] hover:border-[#28B8F6]/30 transition-all cursor-pointer" onClick={() => setSelectedWorkflow(wf)}>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle className="text-lg">{wf.name}</CardTitle>
                  <span className="text-xs px-2 py-1 rounded-full bg-[#28B8F6]/10 text-[#28B8F6] font-mono">
                    {wf.creditCost} cr
                  </span>
                </div>
              </CardHeader>
              <CardContent>
                <p className="text-gray-400 text-sm mb-4 line-clamp-2">{wf.description}</p>
                <Button size="sm" className="bg-[#28B8F6] hover:bg-[#28B8F6]/80 text-[#191919]">
                  <Play className="mr-1 h-3 w-3" /> Run
                </Button>
              </CardContent>
            </Card>
          ))
        )}
      </div>

      {/* Run history */}
      <h2 className="text-xl font-bold mb-4">Run History</h2>
      <Card className="bg-[#222] border-[#333]">
        <CardContent className="p-0">
          {!runs || runs.length === 0 ? (
            <p className="text-gray-500 text-sm p-6">No runs yet. Run a workflow to see results here.</p>
          ) : (
            <div className="divide-y divide-[#333]">
              {runs.map((run: any) => (
                <div key={run.id} className="flex items-center justify-between px-6 py-4">
                  <div className="flex items-center gap-3">
                    <Zap className="h-4 w-4 text-[#7F6DE7]" />
                    <div>
                      <p className="text-sm font-medium">{run.workflowName}</p>
                      <p className="text-xs text-gray-500">{run.model || 'default'} • {new Date(run.createdAt).toLocaleString()}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="text-xs text-gray-500 font-mono">-{run.creditCost} cr</span>
                    <span className={`text-xs px-2 py-1 rounded-full ${
                      run.status === 'succeeded' ? 'bg-green-500/10 text-green-400' :
                      run.status === 'failed' ? 'bg-red-500/10 text-red-400' :
                      run.status === 'running' ? 'bg-[#28B8F6]/10 text-[#28B8F6]' :
                      'bg-gray-500/10 text-gray-400'
                    }`}>
                      {run.status}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {selectedWorkflow && <RunModal workflow={selectedWorkflow} onClose={() => setSelectedWorkflow(null)} />}
    </section>
  );
}
