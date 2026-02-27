const KIE_CREDIT_URL = 'https://api.kie.ai/api/v1/chat/credit';
const LOW_CREDIT_THRESHOLD = 500; // Alert when below this

export async function getKieCredits(): Promise<number | null> {
  const apiKey = process.env.KIE_API_KEY;
  if (!apiKey) return null;

  try {
    const res = await fetch(KIE_CREDIT_URL, {
      headers: { 'Authorization': `Bearer ${apiKey}` },
    });
    if (!res.ok) return null;
    const data = await res.json();
    // Try common response shapes
    const credits = data.credits ?? data.credit ?? data.balance ?? data.data?.credits ?? data.data?.credit ?? data.data?.balance;
    console.log('[KIE] Credit check response:', JSON.stringify(data));
    return typeof credits === 'number' ? credits : null;
  } catch (err) {
    console.error('[KIE] Credit check failed:', err);
    return null;
  }
}

export function isLowCredits(credits: number): boolean {
  return credits < LOW_CREDIT_THRESHOLD;
}

export async function sendLowCreditAlert(credits: number) {
  const adminEmail = process.env.ADMIN_EMAIL;
  const resendKey = process.env.RESEND_API_KEY;
  if (!adminEmail || !resendKey) {
    console.warn('[KIE] Low credits alert: no ADMIN_EMAIL or RESEND_API_KEY configured. Credits:', credits);
    return;
  }

  try {
    await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${resendKey}`,
      },
      body: JSON.stringify({
        from: process.env.EMAIL_FROM || 'Fanverse <noreply@fanverse.app>',
        to: [adminEmail],
        subject: `⚠️ Fanverse: kie.ai credits low (${credits} remaining)`,
        html: `
          <div style="font-family: sans-serif; max-width: 480px; margin: 0 auto; padding: 24px;">
            <h2 style="color: #ef4444;">⚠️ Low API Credits Alert</h2>
            <p>Your kie.ai account has <strong>${credits} credits</strong> remaining.</p>
            <p>Threshold: ${LOW_CREDIT_THRESHOLD} credits</p>
            <p>Please recharge your kie.ai account to avoid generation failures.</p>
            <a href="https://kie.ai" style="display: inline-block; background: #28B8F6; color: #191919; padding: 12px 24px; border-radius: 8px; text-decoration: none; font-weight: 600; margin: 16px 0;">Go to kie.ai</a>
          </div>
        `,
      }),
    });
    console.log('[KIE] Low credit alert sent to', adminEmail);
  } catch (err) {
    console.error('[KIE] Failed to send alert:', err);
  }
}
