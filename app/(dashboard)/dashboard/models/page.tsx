import { AI_PROVIDERS, PROVIDER_IDS } from '@/lib/ai/providers';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { CheckCircle } from 'lucide-react';

export default function ModelsPage() {
  return (
    <section className="flex-1 p-4 lg:p-8">
      <h1 className="text-2xl lg:text-3xl font-bold mb-4">AI Models</h1>
      <p className="text-gray-400 mb-8 max-w-2xl">
        Fanverse supports multiple cutting-edge AI models. Choose the best one for your creative needs when running workflows.
      </p>

      <div className="grid sm:grid-cols-2 gap-6">
        {PROVIDER_IDS.map((id) => {
          const provider = AI_PROVIDERS[id];
          return (
            <Card key={id} className="bg-[#222] border-[#333] hover:border-[#7F6DE7]/30 transition-all">
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <span className="text-3xl">{provider.icon}</span>
                    <CardTitle className="text-xl">{provider.name}</CardTitle>
                  </div>
                  <div className="flex items-center gap-1.5 text-green-400">
                    <CheckCircle className="h-4 w-4" />
                    <span className="text-xs font-medium">Available</span>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <p className="text-gray-400">{provider.description}</p>
                <div className="mt-4 flex items-center gap-2">
                  <span className="text-xs px-2 py-1 rounded bg-[#2a2a2a] text-gray-400 border border-[#333]">
                    {id}
                  </span>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>
    </section>
  );
}
