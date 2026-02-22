export default function PrivacyPage() {
  return (
    <section className="flex-1 p-4 lg:p-8 max-w-3xl mx-auto">
      <h1 className="text-3xl font-bold mb-8">Privacy Policy</h1>
      <div className="prose prose-invert prose-gray max-w-none space-y-4 text-gray-400">
        <p>Last updated: February 2026</p>
        <p>Your privacy is important to us. This policy describes how Fanverse collects, uses, and protects your data.</p>
        <h2 className="text-xl font-semibold text-[#FEFEFE]">1. Data We Collect</h2>
        <p>Account information (email, name), usage data (workflow runs, credit transactions), and payment information (processed securely via Stripe).</p>
        <h2 className="text-xl font-semibold text-[#FEFEFE]">2. How We Use Your Data</h2>
        <p>To provide the service, process payments, improve our platform, and communicate important updates.</p>
        <h2 className="text-xl font-semibold text-[#FEFEFE]">3. Data Protection</h2>
        <p>We use industry-standard security measures. Payment data is handled exclusively by Stripe.</p>
        <h2 className="text-xl font-semibold text-[#FEFEFE]">4. Contact</h2>
        <p>For privacy inquiries, contact us at privacy@fanverse.ai</p>
      </div>
    </section>
  );
}
