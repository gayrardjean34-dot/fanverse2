import { AI_PROVIDERS } from '@/lib/ai/providers';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { CheckCircle } from 'lucide-react';

export default function ModelsPage() {
  return (
    <section className="flex-1 p-4 lg:p-8">
      <h1 className="text-2xl font-bold mb-2">AI Models</h1>
      <p className="text-gray-400 mb-8">
        Choose from our curated selection of cutting-edge AI models for your workflows.
      </p>

      <div className="grid md:grid-cols-2 gap-6">
        {Object.entries(AI_PROVIDERS).map(([id, provider]) => (
          <Card key={id} className="bg-[#222] border-[#333] hover:border-[#7F6DE7]/30 transition-colors">
            <CardHeader>
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-3">
                  <span className="text-3xl">{provider.icon}</span>
                  <div>
                    <CardTitle className="text-lg">{provider.name}</CardTitle>
                    <span className="text-xs text-gray-500 font-mono">{id}</span>
                  </div>
                </div>
                <div className="flex items-center text-green-400 text-sm">
                  <CheckCircle className="h-4 w-4 mr-1" />
                  Available
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <p className="text-gray-400 text-sm">{provider.description}</p>
            </CardContent>
          </Card>
        ))}
      </div>
    </section>
  );
}
