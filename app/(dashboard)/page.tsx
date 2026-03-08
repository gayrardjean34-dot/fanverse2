import { Button } from '@/components/ui/button';
import { ArrowRight, Sparkles, Zap, Shield, Cpu, Users } from 'lucide-react';
import Link from 'next/link';
import ModelShowcase from './model-showcase';

export default function HomePage() {
  return (
    <main>
      {/* Fixed animated background — stays in place when scrolling */}
      <div className="fixed inset-0 -z-10 overflow-hidden">
        <video src="/images/LASTHQ.webm" autoPlay loop muted playsInline className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 min-w-full min-h-full w-auto h-auto max-w-none" />
      </div>

      {/* Hero — transparent to let video background show through */}
      <section className="relative py-24 overflow-hidden bg-transparent">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative">
          <div className="text-center max-w-3xl mx-auto">
            <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-[#28B8F6]/10 text-[#28B8F6] text-sm font-medium mb-8">
              <Sparkles className="h-4 w-4" />
              AI-Powered Creative Workflows
            </div>
            <h1 className="text-5xl sm:text-6xl md:text-7xl font-bold tracking-tight mb-6">
              Create your AI Influencer with
              <span className="block fan-gradient-text">Fanverse</span>
            </h1>
            <p className="text-lg sm:text-xl text-gray-400 mb-10 max-w-2xl mx-auto">
              Scale your AI Influencer with AI automations. Generate realistic images,
              videos, for your AI influencer, using cutting-edge models. Files metadata are cleaned,
              and ready to post on social medias to avoid getting flagged. — all in one content creation platform.
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
      <section className="py-20 bg-transparent relative">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <h2 className="text-3xl font-bold text-center mb-16">
            Everything you need to <span className="fan-gradient-text">create</span>
          </h2>
          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-8">
            {[
              {
                icon: Zap,
                title: 'Exclusive AI Automations',
                description: 'Run powerful AI Automations with a single click. Generate professional Carousels, Selfies, Face-swap, Videos and more in one click!',
                color: '#28B8F6',
              },
              {
                icon: Cpu,
                title: 'Latest AI Models',
                description: 'Choose from top AI models — Nano Banana Pro, Kling, Grok Imagine, Seedream. Pick the best for your needs.',
                color: '#7F6DE7',
              },
              {
                icon: Shield,
                title: 'Pay as You Go',
                description: 'Flexible credit system. Subscribe monthly or buy credit packs. Only pay for what you use.',
                color: '#D324D9',
              },
              {
                icon: Users,
                title: 'Personalized Automations',
                description: "You can ask us to create customized automations just for your use case. Our team will review your request and create your automation on our app!",
                color: '#F6A828',
              },
            ].map((feature) => (
              <div
                key={feature.title}
                className="p-6 rounded-xl bg-black/40 backdrop-blur-sm border border-white/10 hover:border-white/20 transition-all fan-glow"
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

      {/* Models showcase */}
      <ModelShowcase />

      {/* CTA */}
      <section className="py-20 bg-transparent relative">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <h2 className="text-3xl sm:text-4xl font-bold mb-4">
            Ready to monetize your <span className="fan-gradient-text">AI Influencer</span>?
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
      <footer className="py-8 bg-transparent relative">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col items-center gap-3">
          <p className="text-sm text-gray-500">© 2026 Fanverse. All rights reserved.</p>
          <div className="flex items-center gap-6 text-sm text-gray-500">
            <Link href="/contact" className="hover:text-gray-300">Contact</Link>
            <Link href="/privacy" className="hover:text-gray-300">Privacy</Link>
            <Link href="/terms" className="hover:text-gray-300">Terms</Link>
            <a href="https://discord.gg/bn6DFKwY" target="_blank" rel="noopener noreferrer" className="hover:text-[#5865F2] transition-colors">
              <svg className="h-5 w-5" viewBox="0 0 24 24" fill="currentColor">
                <path d="M20.317 4.37a19.791 19.791 0 0 0-4.885-1.515.074.074 0 0 0-.079.037c-.21.375-.444.864-.608 1.25a18.27 18.27 0 0 0-5.487 0 12.64 12.64 0 0 0-.617-1.25.077.077 0 0 0-.079-.037A19.736 19.736 0 0 0 3.677 4.37a.07.07 0 0 0-.032.027C.533 9.046-.32 13.58.099 18.057a.082.082 0 0 0 .031.057 19.9 19.9 0 0 0 5.993 3.03.078.078 0 0 0 .084-.028 14.09 14.09 0 0 0 1.226-1.994.076.076 0 0 0-.041-.106 13.107 13.107 0 0 1-1.872-.892.077.077 0 0 1-.008-.128 10.2 10.2 0 0 0 .372-.292.074.074 0 0 1 .077-.01c3.928 1.793 8.18 1.793 12.062 0a.074.074 0 0 1 .078.01c.12.098.246.198.373.292a.077.077 0 0 1-.006.127 12.299 12.299 0 0 1-1.873.892.077.077 0 0 0-.041.107c.36.698.772 1.362 1.225 1.993a.076.076 0 0 0 .084.028 19.839 19.839 0 0 0 6.002-3.03.077.077 0 0 0 .032-.054c.5-5.177-.838-9.674-3.549-13.66a.061.061 0 0 0-.031-.03zM8.02 15.33c-1.183 0-2.157-1.085-2.157-2.419 0-1.333.956-2.419 2.157-2.419 1.21 0 2.176 1.095 2.157 2.42 0 1.333-.956 2.418-2.157 2.418zm7.975 0c-1.183 0-2.157-1.085-2.157-2.419 0-1.333.956-2.419 2.157-2.419 1.21 0 2.176 1.095 2.157 2.42 0 1.333-.947 2.418-2.157 2.418z"/>
              </svg>
            </a>
          </div>
        </div>
      </footer>
    </main>
  );
}
