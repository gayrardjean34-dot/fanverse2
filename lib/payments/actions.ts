'use server';

import { redirect } from 'next/navigation';
import { createCheckoutSession, createCreditPackCheckout, createCustomerPortalSession } from './stripe';
import { withTeam } from '@/lib/auth/middleware';

export const checkoutAction = withTeam(async (formData, team) => {
  const priceId = formData.get('priceId') as string;
  if (!priceId) {
    redirect('/pricing?error=missing_price');
  }
  await createCheckoutSession({ team, priceId });
});

export const creditPackCheckoutAction = withTeam(async (formData, team) => {
  const priceId = formData.get('priceId') as string;
  if (!priceId) {
    redirect('/pricing?error=missing_price');
  }
  await createCreditPackCheckout({ team, priceId });
});

export const customerPortalAction = withTeam(async (_, team) => {
  const portalSession = await createCustomerPortalSession(team);
  redirect(portalSession.url);
});
