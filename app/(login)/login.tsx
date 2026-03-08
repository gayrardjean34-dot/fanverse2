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
  const googleError = searchParams.get('error');
  const [state, formAction, pending] = useActionState<ActionState, FormData>(
    mode === 'signin' ? signIn : signUp,
    { error: '' }
  );

  return (
    <div className="min-h-[100dvh] flex flex-col justify-center py-12 px-4 sm:px-6 lg:px-8 bg-[#191919]">
      <div className="sm:mx-auto sm:w-full sm:max-w-md">
        <div className="flex justify-center">
          <Link href="/">
            <img src="/images/logo-header.png" alt="Fanverse" className="h-36 object-contain hover:opacity-80 transition-opacity" />
          </Link>
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

            {(state?.error || googleError) && (
              <div className="text-red-400 text-sm bg-red-500/10 border border-red-500/30 rounded-lg p-3">
                {state?.error || (googleError === 'google_denied' ? 'Google sign-in was cancelled.' : 'Google sign-in failed. Please try again.')}
              </div>
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

          {/* Google OAuth separator */}
          <div className="mt-6">
            <div className="relative">
              <div className="absolute inset-0 flex items-center">
                <div className="w-full border-t border-[#333]" />
              </div>
              <div className="relative flex justify-center text-sm">
                <span className="px-2 bg-[#222] text-gray-500">or</span>
              </div>
            </div>

            <div className="mt-6">
              <a
                href="/api/auth/google"
                className="w-full flex items-center justify-center gap-3 py-2.5 px-4 border border-[#333] rounded-lg text-sm font-medium text-gray-300 bg-transparent hover:bg-[#333] transition-colors"
              >
                <svg className="h-5 w-5" viewBox="0 0 24 24">
                  <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z" />
                  <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
                  <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" />
                  <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
                </svg>
                Continue with Google
              </a>
            </div>
          </div>

          {/* Switch between sign in / sign up */}
          <div className="mt-4">
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

            <div className="mt-4">
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
