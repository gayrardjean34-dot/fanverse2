'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Loader2, Send, CheckCircle } from 'lucide-react';
import Link from 'next/link';

const DISCORD_INVITE = 'https://discord.gg/bn6DFKwY';

export default function ContactPage() {
  const [email, setEmail] = useState('');
  const [subject, setSubject] = useState('');
  const [message, setMessage] = useState('');
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState('');

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!email.trim() || !message.trim()) {
      setError('Please fill in your email and message.');
      return;
    }
    setLoading(true);
    setError('');
    try {
      const res = await fetch('/api/contact', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, subject, message }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || 'Failed to send message.');
      } else {
        setSuccess(true);
      }
    } catch {
      setError('Something went wrong. Please try again.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <section className="flex-1 py-16 px-4">
      <div className="max-w-xl mx-auto">
        <h1 className="text-3xl font-bold mb-2">Contact Us</h1>
        <p className="text-gray-400 mb-8">
          Need help or have a question? Send us a message and we&apos;ll get back to you.
          <span className="text-gray-500 text-sm block mt-1">Limited to 2 messages per week.</span>
        </p>

        {success ? (
          <div className="text-center py-12">
            <CheckCircle className="h-16 w-16 text-green-400 mx-auto mb-4" />
            <h2 className="text-xl font-bold mb-2">Message Sent!</h2>
            <p className="text-gray-400 mb-6">We&apos;ll get back to you as soon as possible.</p>
            <Button
              onClick={() => { setSuccess(false); setEmail(''); setSubject(''); setMessage(''); }}
              variant="outline"
              className="border-[#333] text-gray-300 hover:bg-[#333]"
            >
              Send Another
            </Button>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-5">
            <div>
              <Label className="text-gray-300 mb-1">Email *</Label>
              <Input
                type="email"
                className="bg-[#222] border-[#333] text-[#FEFEFE] mt-1"
                placeholder="your@email.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
              />
            </div>

            <div>
              <Label className="text-gray-300 mb-1">Subject</Label>
              <Input
                className="bg-[#222] border-[#333] text-[#FEFEFE] mt-1"
                placeholder="What's this about?"
                value={subject}
                onChange={(e) => setSubject(e.target.value)}
              />
            </div>

            <div>
              <Label className="text-gray-300 mb-1">Message *</Label>
              <textarea
                className="w-full bg-[#222] border border-[#333] text-[#FEFEFE] rounded-lg p-3 text-sm min-h-[150px] focus:border-[#28B8F6]/50 outline-none transition-colors"
                placeholder="How can we help you?"
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                maxLength={2000}
                required
              />
              <span className="text-xs text-gray-500">{message.length}/2000</span>
            </div>

            {error && <p className="text-red-400 text-sm">{error}</p>}

            <Button
              type="submit"
              disabled={loading}
              className="w-full bg-[#28B8F6] hover:bg-[#28B8F6]/80 text-[#191919] font-semibold"
            >
              {loading ? (
                <><Loader2 className="animate-spin mr-2 h-4 w-4" />Sending...</>
              ) : (
                <><Send className="mr-2 h-4 w-4" />Send Message</>
              )}
            </Button>
          </form>
        )}

        {/* Discord section */}
        <div className="mt-16 pt-8 border-t border-[#333] text-center">
          <p className="text-gray-400 mb-4">For more questions, join us on Discord</p>
          <a
            href={DISCORD_INVITE}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-3 px-6 py-3 rounded-xl bg-[#5865F2]/10 border border-[#5865F2]/30 hover:bg-[#5865F2]/20 transition-colors"
          >
            <svg className="h-8 w-8" viewBox="0 0 24 24" fill="#5865F2">
              <path d="M20.317 4.37a19.791 19.791 0 0 0-4.885-1.515.074.074 0 0 0-.079.037c-.21.375-.444.864-.608 1.25a18.27 18.27 0 0 0-5.487 0 12.64 12.64 0 0 0-.617-1.25.077.077 0 0 0-.079-.037A19.736 19.736 0 0 0 3.677 4.37a.07.07 0 0 0-.032.027C.533 9.046-.32 13.58.099 18.057a.082.082 0 0 0 .031.057 19.9 19.9 0 0 0 5.993 3.03.078.078 0 0 0 .084-.028 14.09 14.09 0 0 0 1.226-1.994.076.076 0 0 0-.041-.106 13.107 13.107 0 0 1-1.872-.892.077.077 0 0 1-.008-.128 10.2 10.2 0 0 0 .372-.292.074.074 0 0 1 .077-.01c3.928 1.793 8.18 1.793 12.062 0a.074.074 0 0 1 .078.01c.12.098.246.198.373.292a.077.077 0 0 1-.006.127 12.299 12.299 0 0 1-1.873.892.077.077 0 0 0-.041.107c.36.698.772 1.362 1.225 1.993a.076.076 0 0 0 .084.028 19.839 19.839 0 0 0 6.002-3.03.077.077 0 0 0 .032-.054c.5-5.177-.838-9.674-3.549-13.66a.061.061 0 0 0-.031-.03zM8.02 15.33c-1.183 0-2.157-1.085-2.157-2.419 0-1.333.956-2.419 2.157-2.419 1.21 0 2.176 1.095 2.157 2.42 0 1.333-.956 2.418-2.157 2.418zm7.975 0c-1.183 0-2.157-1.085-2.157-2.419 0-1.333.956-2.419 2.157-2.419 1.21 0 2.176 1.095 2.157 2.42 0 1.333-.947 2.418-2.157 2.418z"/>
            </svg>
            <span className="text-[#5865F2] font-semibold">Join our Discord</span>
          </a>
        </div>
      </div>
    </section>
  );
}
