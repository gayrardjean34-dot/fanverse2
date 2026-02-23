import { checkoutAction, creditPackCheckoutAction } from '@/lib/payments/actions';
import { Check, Sparkles } from 'lucide-react';
import { getStripePrices, getStripeProducts, CREDIT_PACKS } from '@/lib/payments/stripe';
import { SubmitButton } from './submit-button';

export const revalidate = 3600;

export default async function PricingPage() {
  const [prices, products] = await Promise.all([
    getStripePrices(),
    getStripeProducts(),
  ]);

  const proPlan = products.find((p) => p.name === 'Fanverse Pro') || products[0];
  const proPrice = prices.find((p) => p.productId === proPlan?.id) || prices[0];

  return (
    <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
      <div className="text-center mb-16">
        <h1 className="text-4xl font-bold mb-4">
          Simple, <span className="fan-gradient-text">transparent</span> pricing
        </h1>
        <p className="text-lg text-gray-400 max-w-xl mx-auto">
          Subscribe monthly for credits and perks, or buy credit packs as you go.
        </p>
      </div>

      {/* Subscription */}
      <div className="max-w-md mx-auto mb-20">
        <div className="rounded-2xl bg-[#222] border border-[#28B8F6]/30 p-8 fan-glow">
          <div className="flex items-center gap-2 mb-4">
            <Sparkles className="h-5 w-5 text-[#28B8F6]" />
            <span className="text-sm font-medium text-[#28B8F6]">Most Popular</span>
          </div>
          <h2 className="text-2xl font-bold mb-2">{proPlan?.name || 'Fanverse Pro'}</h2>
          <p className="text-gray-400 text-sm mb-6">100 credits/month + access to all workflows</p>
          <p className="text-5xl font-bold mb-1">
            ${(proPrice?.unitAmount || 1900) / 100}
            <span className="text-lg font-normal text-gray-400"> /month</span>
          </p>
          <p className="text-sm text-gray-500 mb-8">14-day free trial included</p>
          <ul className="space-y-3 mb-8">
            {[
              '100 credits per month',
              'Access to all AI workflows',
              'All 4 AI models',
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
          <div key={pack.id} className="rounded-xl bg-[#222] border border-[#333] hover:border-[#7F6DE7]/50 transition-all p-6">
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
    </main>
  );
}
