export default function TermsPage() {
  return (
    <section className="flex-1 p-4 lg:p-8 max-w-3xl mx-auto">
      <h1 className="text-3xl font-bold mb-8">Terms of Service</h1>
      <div className="prose prose-invert prose-gray max-w-none space-y-4 text-gray-400">
        <p>Last updated: February 2026</p>
        <p>These Terms of Service govern your use of Fanverse. By using our service, you agree to these terms.</p>
        <h2 className="text-xl font-semibold text-[#FEFEFE]">1. Service Description</h2>
        <p>Fanverse provides AI-powered creative workflows accessible through a credit-based system.</p>
        <h2 className="text-xl font-semibold text-[#FEFEFE]">2. Credits & Payments</h2>
        <p>Credits are non-refundable digital units used to run AI workflows. Unused credits do not expire with an active subscription.</p>
        <h2 className="text-xl font-semibold text-[#FEFEFE]">3. Acceptable Use</h2>
        <p>You agree not to use Fanverse for illegal, harmful, or abusive purposes.</p>
        <h2 className="text-xl font-semibold text-[#FEFEFE]">4. Contact</h2>
        <p>For questions, contact us at support@fanverse.ai</p>
      </div>
    </section>
  );
}
