'use client';

import { useState, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Loader2, ArrowLeft } from 'lucide-react';

function ResetForm() {
  const searchParams = useSearchParams();
  const token = searchParams.get('token');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState('');

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (password !== confirmPassword) {
      setError('Passwords do not match.');
      return;
    }
    if (password.length < 8) {
      setError('Password must be at least 8 characters.');
      return;
    }
    setLoading(true);
    setError('');

    try {
      const res = await fetch('/api/auth/reset-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token, password }),
      });

      if (!res.ok) {
        const data = await res.json();
        setError(data.error || 'Something went wrong.');
      } else {
        setSuccess(true);
      }
    } catch {
      setError('Something went wrong. Please try again.');
    } finally {
      setLoading(false);
    }
  }

  if (!token) {
    return (
      <div className="text-center">
        <p className="text-red-400 mb-4">Invalid or missing reset token.</p>
        <Link href="/forgot-password" className="text-[#28B8F6] hover:underline">
          Request a new reset link
        </Link>
      </div>
    );
  }

  if (success) {
    return (
      <div className="text-center">
        <div className="text-green-400 text-sm bg-green-500/10 border border-green-500/30 rounded-lg p-4 mb-6">
          Your password has been reset successfully!
        </div>
        <Link
          href="/sign-in"
          className="inline-flex items-center text-sm text-[#28B8F6] hover:underline"
        >
          <ArrowLeft className="mr-1 h-4 w-4" />
          Sign in with your new password
        </Link>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <div>
        <Label htmlFor="password" className="block text-sm font-medium text-gray-400">
          New Password
        </Label>
        <div className="mt-1">
          <Input
            id="password"
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            minLength={8}
            className="rounded-lg bg-[#191919] border-[#333] text-[#FEFEFE] placeholder-gray-500 focus:ring-[#28B8F6] focus:border-[#28B8F6]"
            placeholder="Enter new password"
          />
        </div>
      </div>

      <div>
        <Label htmlFor="confirmPassword" className="block text-sm font-medium text-gray-400">
          Confirm Password
        </Label>
        <div className="mt-1">
          <Input
            id="confirmPassword"
            type="password"
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
            required
            minLength={8}
            className="rounded-lg bg-[#191919] border-[#333] text-[#FEFEFE] placeholder-gray-500 focus:ring-[#28B8F6] focus:border-[#28B8F6]"
            placeholder="Confirm new password"
          />
        </div>
      </div>

      {error && (
        <div className="text-red-400 text-sm bg-red-500/10 border border-red-500/30 rounded-lg p-3">
          {error}
        </div>
      )}

      <Button
        type="submit"
        className="w-full rounded-lg bg-[#28B8F6] hover:bg-[#28B8F6]/80 text-[#191919] font-semibold"
        disabled={loading}
      >
        {loading ? (
          <>
            <Loader2 className="animate-spin mr-2 h-4 w-4" />
            Resetting...
          </>
        ) : (
          'Reset Password'
        )}
      </Button>
    </form>
  );
}

export default function ResetPasswordPage() {
  return (
    <div className="min-h-[100dvh] flex flex-col justify-center py-12 px-4 sm:px-6 lg:px-8 bg-[#191919]">
      <div className="sm:mx-auto sm:w-full sm:max-w-md">
        <div className="flex justify-center">
          <img src="/images/logo-header.png" alt="Fanverse" className="h-10 object-contain" />
        </div>
        <h2 className="mt-6 text-center text-2xl font-bold text-[#FEFEFE]">
          Set new password
        </h2>
      </div>

      <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-md">
        <div className="bg-[#222] border border-[#333] rounded-xl p-8">
          <Suspense fallback={<div className="text-center text-gray-400">Loading...</div>}>
            <ResetForm />
          </Suspense>
        </div>
      </div>
    </div>
  );
}
