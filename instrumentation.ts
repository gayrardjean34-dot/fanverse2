export async function register() {
  // Only run in Node.js runtime (not edge, not build)
  if (process.env.NEXT_RUNTIME !== 'nodejs') return;

  try {
    const { client } = await import('@/lib/db/drizzle');
    const { db } = await import('@/lib/db/drizzle');
    const { promoCodes } = await import('@/lib/db/schema');
    const { isNull, count } = await import('drizzle-orm');

    // Create the table if it doesn't exist
    await client`
      CREATE TABLE IF NOT EXISTS promo_codes (
        id SERIAL PRIMARY KEY,
        code VARCHAR(50) NOT NULL UNIQUE,
        credits INTEGER NOT NULL,
        used_by_user_id INTEGER REFERENCES users(id),
        used_at TIMESTAMP,
        created_at TIMESTAMP NOT NULL DEFAULT NOW()
      )
    `;

    // Count how many unused codes we have
    const [{ value }] = await db
      .select({ value: count() })
      .from(promoCodes)
      .where(isNull(promoCodes.usedByUserId));

    // If we already have unused codes, nothing to do
    if (Number(value) >= 5) return;

    // Pre-generated codes to insert
    const PROMO_CODES = [
      'FV-KART-2X9P',
      'FV-MOON-7QBR',
      'FV-STAR-4NHW',
      'FV-FIRE-8MZC',
      'FV-WAVE-3TVJ',
      'FV-GLOW-6YPD',
      'FV-BOLT-1XKF',
      'FV-NOVA-5RWQ',
      'FV-APEX-9LBH',
      'FV-ZEST-2GNV',
      'FV-DUSK-7TCM',
      'FV-FLUX-4PWX',
      'FV-HALO-8QZJ',
      'FV-JADE-3KBR',
      'FV-LYNX-6MFT',
      'FV-ORBS-1NVH',
      'FV-PEAK-5CWD',
      'FV-RIFT-9XGP',
      'FV-SAGE-2TLQ',
      'FV-TIDE-7BKN',
    ];

    // Insert codes that don't already exist (ignore conflicts)
    for (const code of PROMO_CODES) {
      await db
        .insert(promoCodes)
        .values({ code, credits: 100 })
        .onConflictDoNothing();
    }

    console.log('[promo] Seeded promo codes into database.');
  } catch (err) {
    // Non-fatal — log and continue
    console.error('[promo] Failed to seed promo codes:', err);
  }
}
