'use client';

import Link from 'next/link';
import { useActionState } from 'react';
import { useSearchParams } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Loader2 } from 'lucide-react';
import { signIn, signUp } from './actions';
import { ActionState } from '@/lib/auth/middleware';

export function Login({ mode = 'signin' }: { mode?: 'signin' | 'signup' }) {
  const searchParams = useSearchParams();
  const redirect = searchParams.get('redirect');
  const priceId = searchParams.get('priceId');
  const inviteId = searchParams.get('inviteId');
  const [state, formAction, pending] = useActionState<ActionState, FormData>(
    mode === 'signin' ? signIn : signUp,
    { error: '' }
  );

  return (
    <div className="min-h-[100dvh] flex flex-col justify-center py-12 px-4 sm:px-6 lg:px-8 bg-[#191919]">
      <div className="sm:mx-auto sm:w-full sm:max-w-md">
        <div className="flex justify-center">
          <img src="/images/logo-header.png" alt="Fanverse" className="h-10 object-contain" />
        </div>
        <h2 className="mt-6 text-center text-2xl font-bold text-[#FEFEFE]">
          {mode === 'signin'
            ? 'Sign in to your account'
            : 'Create your account'}
        </h2>
      </div>

      <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-md">
        <div className="bg-[#222] border border-[#333] rounded-xl p-8">
          <form className="space-y-6" action={formAction}>
            <input type="hidden" name="redirect" value={redirect || ''} />
            <input type="hidden" name="priceId" value={priceId || ''} />
            <input type="hidden" name="inviteId" value={inviteId || ''} />
            <div>
              <Label htmlFor="email" className="block text-sm font-medium text-gray-400">
                Email
              </Label>
              <div className="mt-1">
                <Input
                  id="email"
                  name="email"
                  type="email"
                  autoComplete="email"
                  defaultValue={state.email}
                  required
                  maxLength={50}
                  className="rounded-lg bg-[#191919] border-[#333] text-[#FEFEFE] placeholder-gray-500 focus:ring-[#28B8F6] focus:border-[#28B8F6]"
                  placeholder="Enter your email"
                />
              </div>
            </div>

            <div>
              <Label htmlFor="password" className="block text-sm font-medium text-gray-400">
                Password
              </Label>
              <div className="mt-1">
                <Input
                  id="password"
                  name="password"
                  type="password"
                  autoComplete={mode === 'signin' ? 'current-password' : 'new-password'}
                  defaultValue={state.password}
                  required
                  minLength={8}
                  maxLength={100}
                  className="rounded-lg bg-[#191919] border-[#333] text-[#FEFEFE] placeholder-gray-500 focus:ring-[#28B8F6] focus:border-[#28B8F6]"
                  placeholder="Enter your password"
                />
              </div>
            </div>

            {mode === 'signin' && (
              <div className="flex justify-end">
                <Link
                  href="/forgot-password"
                  className="text-sm text-[#28B8F6] hover:underline"
                >
                  Forgot password?
                </Link>
              </div>
            )}

            {state?.error && (
              <div className="text-red-400 text-sm bg-red-500/10 border border-red-500/30 rounded-lg p-3">{state.error}</div>
            )}

            <div>
              <Button
                type="submit"
                className="w-full rounded-lg bg-[#28B8F6] hover:bg-[#28B8F6]/80 text-[#191919] font-semibold"
                disabled={pending}
              >
                {pending ? (
                  <>
                    <Loader2 className="animate-spin mr-2 h-4 w-4" />
                    Loading...
                  </>
                ) : mode === 'signin' ? (
                  'Sign in'
                ) : (
                  'Sign up'
                )}
              </Button>
            </div>
          </form>

          <div className="mt-6">
            <div className="relative">
              <div className="absolute inset-0 flex items-center">
                <div className="w-full border-t border-[#333]" />
              </div>
              <div className="relative flex justify-center text-sm">
                <span className="px-2 bg-[#222] text-gray-500">
                  {mode === 'signin' ? 'New to Fanverse?' : 'Already have an account?'}
                </span>
              </div>
            </div>

            <div className="mt-6">
              <Link
                href={`${mode === 'signin' ? '/sign-up' : '/sign-in'}${redirect ? `?redirect=${redirect}` : ''}${priceId ? `&priceId=${priceId}` : ''}`}
                className="w-full flex justify-center py-2 px-4 border border-[#333] rounded-lg text-sm font-medium text-gray-300 bg-transparent hover:bg-[#333] transition-colors"
              >
                {mode === 'signin' ? 'Create an account' : 'Sign in to existing account'}
              </Link>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
