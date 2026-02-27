import { AI_PROVIDERS, ACTIVE_PROVIDER_IDS } from '@/lib/ai/providers';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { CheckCircle, Clock, Image, Film } from 'lucide-react';

export default function ModelsPage() {
  const activeIds = ACTIVE_PROVIDER_IDS;
  const comingSoonIds = Object.keys(AI_PROVIDERS).filter((id) => !activeIds.includes(id));

  return (
    <section className="flex-1 p-4 lg:p-8">
      <h1 className="text-2xl lg:text-3xl font-bold mb-4">AI Models</h1>
      <p className="text-gray-400 mb-8 max-w-2xl">
        Fanverse supports multiple cutting-edge AI models for image and video generation. Choose the best one for your creative needs.
      </p>

      <div className="grid sm:grid-cols-2 gap-6">
        {activeIds.map((id) => {
          const provider = AI_PROVIDERS[id];
          return (
            <Card key={id} className="bg-[#222] border-[#333] hover:border-[#7F6DE7]/30 transition-all">
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <span className="text-3xl">{provider.icon}</span>
                    <div>
                      <CardTitle className="text-xl">{provider.name}</CardTitle>
                      <div className="flex items-center gap-1.5 mt-1">
                        {provider.type === 'video' ? (
                          <span className="text-xs px-1.5 py-0.5 rounded bg-[#7F6DE7]/10 text-[#7F6DE7] flex items-center gap-1">
                            <Film className="h-3 w-3" /> Video
                          </span>
                        ) : (
                          <span className="text-xs px-1.5 py-0.5 rounded bg-[#28B8F6]/10 text-[#28B8F6] flex items-center gap-1">
                            <Image className="h-3 w-3" /> Image
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-1.5 text-green-400">
                    <CheckCircle className="h-4 w-4" />
                    <span className="text-xs font-medium">Available</span>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <p className="text-gray-400">{provider.description}</p>
              </CardContent>
            </Card>
          );
        })}
        {comingSoonIds.map((id) => {
          const provider = AI_PROVIDERS[id];
          return (
            <Card key={id} className="bg-[#222] border-[#333] opacity-60">
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <span className="text-3xl">{provider.icon}</span>
                    <CardTitle className="text-xl">{provider.name}</CardTitle>
                  </div>
                  <div className="flex items-center gap-1.5 text-gray-500">
                    <Clock className="h-4 w-4" />
                    <span className="text-xs font-medium">Coming Soon</span>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <p className="text-gray-400">{provider.description}</p>
              </CardContent>
            </Card>
          );
        })}
      </div>
    </section>
  );
}
