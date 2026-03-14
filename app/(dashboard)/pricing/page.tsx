import { checkoutAction, creditPackCheckoutAction } from '@/lib/payments/actions';
import { Check, Sparkles } from 'lucide-react';
import { getStripePrices, getStripeProducts, CREDIT_PACKS } from '@/lib/payments/stripe';
import { SubmitButton } from './submit-button';

export const revalidate = 3600;

export default async function PricingPage() {
  let prices: Awaited<ReturnType<typeof getStripePrices>> = [];
  let products: Awaited<ReturnType<typeof getStripeProducts>> = [];

  try {
    [prices, products] = await Promise.all([
      getStripePrices(),
      getStripeProducts(),
    ]);
  } catch (error) {
    console.error('[PRICING] Failed to fetch Stripe data:', error);
  }

  const proPlan = products.find((p) => p.name === 'Fanverse Pro') || products[0];
  const proPrice = prices.find((p) => p.productId === proPlan?.id) || prices[0];

  return (
    <main className="relative min-h-screen">
      {/* Animated background */}
      <div className="fixed inset-0 -z-10 overflow-hidden">
        <video src="/images/cest ok.webm" autoPlay loop muted playsInline className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 min-w-full min-h-full w-auto h-auto max-w-none" />
      </div>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
      <div className="text-center mb-16">
        <h1 className="text-4xl font-bold mb-4">
          Simple, <span className="fan-gradient-text">transparent</span> pricing
        </h1>
        <p className="text-lg text-gray-400 max-w-xl mx-auto">
          Subscribe monthly for credits and perks, or buy credit packs as you go.
        </p>
      </div>

      {/* Subscriptions */}
      <div className="grid md:grid-cols-2 gap-8 max-w-3xl mx-auto mb-20">
        {/* Starter Plan */}
        <div className="rounded-2xl bg-black/40 backdrop-blur-sm border border-white/10 hover:border-[#7F6DE7]/50 transition-all p-8">
          <h2 className="text-2xl font-bold mb-2">Fanverse Starter</h2>
          <p className="text-gray-400 text-sm mb-6">1,000 credits/month + access to 4 automations</p>
          <p className="text-5xl font-bold mb-1">
            $9.99
            <span className="text-lg font-normal text-gray-400"> /month</span>
          </p>
          <p className="text-sm text-gray-500 mb-8">14-day free trial included</p>
          <ul className="space-y-3 mb-8">
            {[
              '1,000 credits per month',
              'Access to 4 automations',
              'Priority processing',
              'Email support',
            ].map((f) => (
              <li key={f} className="flex items-start gap-2">
                <Check className="h-5 w-5 text-[#7F6DE7] shrink-0 mt-0.5" />
                <span className="text-gray-300">{f}</span>
              </li>
            ))}
          </ul>
          <form action={checkoutAction}>
            <input type="hidden" name="priceId" value={process.env.STRIPE_PRICE_STARTER || ''} />
            <SubmitButton />
          </form>
        </div>

        {/* Pro Plan */}
        <div className="rounded-2xl bg-black/40 backdrop-blur-sm border border-[#28B8F6]/30 p-8 fan-glow">
          <h2 className="text-2xl font-bold mb-2">{proPlan?.name || 'Fanverse Pro'}</h2>
          <p className="text-gray-400 text-sm mb-6">2,000 credits/month + access to all workflows</p>
          <p className="text-5xl font-bold mb-1">
            ${(proPrice?.unitAmount || 1900) / 100}
            <span className="text-lg font-normal text-gray-400"> /month</span>
          </p>
          <p className="text-sm text-gray-500 mb-8">14-day free trial included</p>
          <ul className="space-y-3 mb-8">
            {[
              '2,000 credits per month',
              'Access to all AI workflows',
              'Priority processing',
              'Email support',
            ].map((f) => (
              <li key={f} className="flex items-start gap-2">
                <Check className="h-5 w-5 text-[#28B8F6] shrink-0 mt-0.5" />
                <span className="text-gray-300">{f}</span>
              </li>
            ))}
          </ul>
          <form action={checkoutAction}>
            <input type="hidden" name="priceId" value={proPrice?.id || ''} />
            <SubmitButton />
          </form>
        </div>
      </div>

      {/* Credit Packs */}
      <div className="text-center mb-10">
        <h2 className="text-2xl font-bold mb-2">Credit Packs</h2>
        <p className="text-gray-400">Need more credits? Buy packs anytime.</p>
      </div>
      <div className="grid sm:grid-cols-3 gap-6 max-w-3xl mx-auto">
        {CREDIT_PACKS.map((pack) => (
          <div key={pack.id} className="rounded-xl bg-black/40 backdrop-blur-sm border border-white/10 hover:border-[#7F6DE7]/50 transition-all p-6">
            <h3 className="text-lg font-semibold mb-1">{pack.name}</h3>
            <p className="text-3xl font-bold mb-1">
              {pack.credits} <span className="text-sm font-normal text-gray-400">credits</span>
            </p>
            <p className="text-gray-400 text-sm mb-6">${pack.price}</p>
            <form action={creditPackCheckoutAction}>
              <input type="hidden" name="priceId" value={process.env[pack.priceEnv] || ''} />
              <button
                type="submit"
                className="w-full py-2 px-4 rounded-lg bg-[#2a2a2a] hover:bg-[#333] border border-[#333] text-sm font-medium transition-colors"
              >
                Buy Pack
              </button>
            </form>
          </div>
        ))}
      </div>
      </div>
    </main>
  );
}
