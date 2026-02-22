'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import useSWR, { mutate } from 'swr';
import { Zap, Play, Loader2, X } from 'lucide-react';
import { AI_PROVIDERS, type ProviderId } from '@/lib/ai/providers';

const fetcher = (url: string) => fetch(url).then((res) => res.json());

type Workflow = {
  id: number;
  slug: string;
  name: string;
  description: string;
  creditCost: number;
  allowedModels: string[];
  inputSchema: Record<string, any>;
};

function RunModal({
  workflow,
  onClose,
}: {
  workflow: Workflow;
  onClose: () => void;
}) {
  const [model, setModel] = useState<string>(
    (workflow.allowedModels && workflow.allowedModels[0]) || ''
  );
  const [inputs, setInputs] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);

  const inputFields = Object.entries(workflow.inputSchema || {});

  async function handleRun() {
    setLoading(true);
    setError(null);
    setResult(null);
    try {
      const res = await fetch('/api/workflows/run', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          workflowSlug: workflow.slug,
          model: model || undefined,
          inputs,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || 'Something went wrong');
      } else {
        setResult(data);
        mutate('/api/credits/balance');
        mutate('/api/workflows/runs?limit=5');
      }
    } catch (err: any) {
      setError(err.message);
    }
    setLoading(false);
  }

  const allowedModels =
    workflow.allowedModels && workflow.allowedModels.length > 0
      ? workflow.allowedModels
      : Object.keys(AI_PROVIDERS);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
      <div className="bg-[#222] border border-[#333] rounded-xl p-6 w-full max-w-lg mx-4 max-h-[80vh] overflow-y-auto">
        <div className="flex justify-between items-center mb-4">
          <h3 className="text-xl font-bold">{workflow.name}</h3>
          <button onClick={onClose} className="text-gray-400 hover:text-white">
            <X className="h-5 w-5" />
          </button>
        </div>
        <p className="text-gray-400 text-sm mb-4">{workflow.description}</p>
        <p className="text-sm mb-4">
          Cost: <span className="text-[#28B8F6] font-semibold">{workflow.creditCost} credits</span>
        </p>

        {/* Model selector */}
        <div className="mb-4">
          <Label className="text-sm text-gray-400 mb-2 block">AI Model</Label>
          <div className="grid grid-cols-2 gap-2">
            {allowedModels.map((m: string) => {
              const provider = AI_PROVIDERS[m as ProviderId];
              return (
                <button
                  key={m}
                  type="button"
                  onClick={() => setModel(m)}
                  className={`p-2 rounded-lg text-left text-sm border transition-colors ${
                    model === m
                      ? 'border-[#28B8F6] bg-[#28B8F6]/10 text-[#28B8F6]'
                      : 'border-[#333] hover:border-[#444] text-gray-300'
                  }`}
                >
                  <span className="mr-1">{provider?.icon || '🤖'}</span>
                  {provider?.name || m}
                </button>
              );
            })}
          </div>
        </div>

        {/* Input fields */}
        {inputFields.length > 0 && (
          <div className="space-y-3 mb-4">
            {inputFields.map(([key, config]: [string, any]) => (
              <div key={key}>
                <Label className="text-sm text-gray-400 mb-1 block">
                  {config?.label || key}
                </Label>
                <Input
                  className="bg-[#191919] border-[#333] text-[#FEFEFE]"
                  placeholder={config?.placeholder || `Enter ${key}`}
                  value={inputs[key] || ''}
                  onChange={(e) =>
                    setInputs((prev) => ({ ...prev, [key]: e.target.value }))
                  }
                />
              </div>
            ))}
          </div>
        )}

        {/* Default prompt if no schema */}
        {inputFields.length === 0 && (
          <div className="mb-4">
            <Label className="text-sm text-gray-400 mb-1 block">Prompt</Label>
            <Input
              className="bg-[#191919] border-[#333] text-[#FEFEFE]"
              placeholder="Enter your prompt..."
              value={inputs['prompt'] || ''}
              onChange={(e) =>
                setInputs((prev) => ({ ...prev, prompt: e.target.value }))
              }
            />
          </div>
        )}

        {error && (
          <div className="p-3 rounded-lg bg-red-500/10 border border-red-500/30 text-red-400 text-sm mb-4">
            {error}
          </div>
        )}

        {result && (
          <div className="p-3 rounded-lg bg-green-500/10 border border-green-500/30 text-green-400 text-sm mb-4">
            Run #{result.runId} created! Status: {result.status}
          </div>
        )}

        <Button
          onClick={handleRun}
          disabled={loading}
          className="w-full bg-[#28B8F6] hover:bg-[#28B8F6]/80 text-[#191919] font-semibold"
        >
          {loading ? (
            <>
              <Loader2 className="animate-spin mr-2 h-4 w-4" />
              Running...
            </>
          ) : (
            <>
              <Play className="mr-2 h-4 w-4" />
              Run Workflow
            </>
          )}
        </Button>
      </div>
    </div>
  );
}

export default function WorkflowsPage() {
  const { data: workflows } = useSWR<Workflow[]>('/api/workflows', fetcher);
  const { data: runsData } = useSWR<any[]>('/api/workflows/runs?limit=10', fetcher);
  const [selectedWorkflow, setSelectedWorkflow] = useState<Workflow | null>(null);

  const statusColor: Record<string, string> = {
    queued: 'bg-yellow-400/20 text-yellow-400',
    running: 'bg-[#28B8F6]/20 text-[#28B8F6]',
    succeeded: 'bg-green-400/20 text-green-400',
    failed: 'bg-red-400/20 text-red-400',
  };

  return (
    <section className="flex-1 p-4 lg:p-8">
      <h1 className="text-2xl font-bold mb-6">AI Workflows</h1>

      {/* Workflow cards */}
      <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6 mb-10">
        {!workflows || workflows.length === 0 ? (
          <Card className="bg-[#222] border-[#333] col-span-full">
            <CardContent className="p-8 text-center">
              <Zap className="h-10 w-10 text-gray-500 mx-auto mb-3" />
              <p className="text-gray-400">No workflows available yet.</p>
              <p className="text-gray-500 text-sm mt-1">Workflows will appear here once configured by an admin.</p>
            </CardContent>
          </Card>
        ) : (
          workflows.map((wf) => (
            <Card
              key={wf.id}
              className="bg-[#222] border-[#333] hover:border-[#28B8F6]/30 transition-colors cursor-pointer"
              onClick={() => setSelectedWorkflow(wf)}
            >
              <CardHeader className="pb-2">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-base font-semibold">{wf.name}</CardTitle>
                  <span className="text-xs bg-[#28B8F6]/20 text-[#28B8F6] px-2 py-1 rounded-full font-medium">
                    {wf.creditCost} credits
                  </span>
                </div>
              </CardHeader>
              <CardContent>
                <p className="text-gray-400 text-sm mb-3">{wf.description}</p>
                <div className="flex gap-1 flex-wrap">
                  {(wf.allowedModels || []).map((m: string) => (
                    <span key={m} className="text-xs bg-[#333] text-gray-400 px-2 py-0.5 rounded">
                      {m}
                    </span>
                  ))}
                </div>
              </CardContent>
            </Card>
          ))
        )}
      </div>

      {/* Recent runs */}
      <h2 className="text-xl font-semibold mb-4">Recent Runs</h2>
      <Card className="bg-[#222] border-[#333]">
        <CardContent className="p-0">
          {!runsData || runsData.length === 0 ? (
            <p className="text-gray-500 text-sm p-6">No runs yet.</p>
          ) : (
            <div className="divide-y divide-[#333]">
              {runsData.map((item: any) => (
                <div key={item.run.id} className="flex items-center justify-between p-4">
                  <div>
                    <p className="font-medium text-sm">{item.workflowName}</p>
                    <p className="text-xs text-gray-500">
                      {item.run.model || 'default'} • {new Date(item.run.createdAt).toLocaleString()}
                    </p>
                  </div>
                  <span className={`text-xs font-medium px-2 py-1 rounded-full ${statusColor[item.run.status] || ''}`}>
                    {item.run.status}
                  </span>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Run modal */}
      {selectedWorkflow && (
        <RunModal
          workflow={selectedWorkflow}
          onClose={() => setSelectedWorkflow(null)}
        />
      )}
    </section>
  );
}
