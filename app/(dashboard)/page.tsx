import { Button } from '@/components/ui/button';
import { ArrowRight, Sparkles, Zap, Shield, Cpu } from 'lucide-react';
import Link from 'next/link';

export default function HomePage() {
  return (
    <main>
      {/* Hero */}
      <section className="relative py-24 overflow-hidden">
        {/* Animated GIF background */}
        <div className="absolute inset-0">
          <video src="/images/logo-animated.webm" autoPlay loop muted playsInline className="w-full h-full object-cover opacity-10" />
          <div className="absolute inset-0 bg-gradient-to-b from-[#191919] via-[#191919]/80 to-[#191919]" />
        </div>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative">
          <div className="text-center max-w-3xl mx-auto">
            <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-[#28B8F6]/10 text-[#28B8F6] text-sm font-medium mb-8">
              <Sparkles className="h-4 w-4" />
              AI-Powered Creative Workflows
            </div>
            <h1 className="text-5xl sm:text-6xl md:text-7xl font-bold tracking-tight mb-6">
              Create with
              <span className="block fan-gradient-text">Fanverse</span>
            </h1>
            <p className="text-lg sm:text-xl text-gray-400 mb-10 max-w-2xl mx-auto">
              Unleash your creativity with powerful AI workflows. Generate stunning images,
              videos, for your AI influencer, using cutting-edge models — all in one platform.
            </p>
            <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
              <Button asChild size="lg" className="rounded-full bg-[#28B8F6] hover:bg-[#28B8F6]/80 text-[#191919] font-semibold text-lg px-8">
                <Link href="/sign-up">
                  Get Started Free
                  <ArrowRight className="ml-2 h-5 w-5" />
                </Link>
              </Button>
              <Button asChild size="lg" variant="outline" className="rounded-full border-[#333] text-[#FEFEFE] hover:bg-[#2a2a2a] text-lg px-8">
                <Link href="/pricing">View Pricing</Link>
              </Button>
            </div>
          </div>
        </div>
      </section>

      {/* Features */}
      <section className="py-20 border-t border-[#333]">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <h2 className="text-3xl font-bold text-center mb-16">
            Everything you need to <span className="fan-gradient-text">create</span>
          </h2>
          <div className="grid md:grid-cols-3 gap-8">
            {[
              {
                icon: Zap,
                title: 'AI Workflows',
                description: 'Run powerful AI generation workflows with a single click. Text-to-image, video generation, and more.',
                color: '#28B8F6',
              },
              {
                icon: Cpu,
                title: 'Multiple Models',
                description: 'Choose from top AI models — Nano Banana Pro, Kling, Grok Imagine, Seedream. Pick the best for your needs.',
                color: '#7F6DE7',
              },
              {
                icon: Shield,
                title: 'Pay as You Go',
                description: 'Flexible credit system. Subscribe monthly or buy credit packs. Only pay for what you use.',
                color: '#D324D9',
              },
            ].map((feature) => (
              <div
                key={feature.title}
                className="p-6 rounded-xl bg-[#222] border border-[#333] hover:border-[#444] transition-all fan-glow"
              >
                <div
                  className="h-12 w-12 rounded-lg flex items-center justify-center mb-4"
                  style={{ backgroundColor: `${feature.color}20` }}
                >
                  <feature.icon className="h-6 w-6" style={{ color: feature.color }} />
                </div>
                <h3 className="text-lg font-semibold mb-2">{feature.title}</h3>
                <p className="text-gray-400">{feature.description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="py-20 border-t border-[#333]">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <h2 className="text-3xl sm:text-4xl font-bold mb-4">
            Ready to create something <span className="fan-gradient-text">amazing</span>?
          </h2>
          <p className="text-lg text-gray-400 mb-8 max-w-xl mx-auto">
            Join Fanverse today and start generating with the most powerful AI models available.
          </p>
          <Button asChild size="lg" className="rounded-full bg-[#28B8F6] hover:bg-[#28B8F6]/80 text-[#191919] font-semibold text-lg px-8">
            <Link href="/sign-up">
              Start Creating
              <ArrowRight className="ml-2 h-5 w-5" />
            </Link>
          </Button>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-[#333] py-8">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center">
            <img src="/images/logo-header.png" alt="Fanverse" className="h-6 object-contain" />
          </div>
          <div className="flex items-center gap-6 text-sm text-gray-500">
            <Link href="/terms" className="hover:text-gray-300">Terms</Link>
            <Link href="/privacy" className="hover:text-gray-300">Privacy</Link>
          </div>
          <p className="text-sm text-gray-500">© 2026 Fanverse. All rights reserved.</p>
        </div>
      </footer>
    </main>
  );
}
