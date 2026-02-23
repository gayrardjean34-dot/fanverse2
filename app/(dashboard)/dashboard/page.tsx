'use client';

import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { customerPortalAction } from '@/lib/payments/actions';
import { TeamDataWithMembers, User } from '@/lib/db/schema';
import useSWR from 'swr';
import { Suspense } from 'react';
import { Coins, CreditCard, Zap, ArrowUpRight, ArrowDownRight, Clock } from 'lucide-react';
import Link from 'next/link';

const fetcher = (url: string) => fetch(url).then((res) => res.json());

function CreditBalance() {
  const { data } = useSWR<{ balance: number; transactions: any[] }>('/api/credits/balance', fetcher);

  return (
    <Card className="bg-[#222] border-[#333]">
      <CardHeader className="flex flex-row items-center justify-between pb-2">
        <CardTitle className="text-sm font-medium text-gray-400">Credit Balance</CardTitle>
        <Coins className="h-5 w-5 text-[#28B8F6]" />
      </CardHeader>
      <CardContent>
        <div className="text-4xl font-bold fan-gradient-text">{data?.balance ?? '—'}</div>
        <p className="text-sm text-gray-500 mt-1">credits available</p>
        <Link href="/pricing" className="text-sm text-[#28B8F6] hover:underline mt-3 inline-block">
          Buy more credits →
        </Link>
      </CardContent>
    </Card>
  );
}

function SubscriptionStatus() {
  const { data: team } = useSWR<TeamDataWithMembers>('/api/team', fetcher);

  const isActive = team?.subscriptionStatus === 'active' || team?.subscriptionStatus === 'trialing';

  return (
    <Card className="bg-[#222] border-[#333]">
      <CardHeader className="flex flex-row items-center justify-between pb-2">
        <CardTitle className="text-sm font-medium text-gray-400">Subscription</CardTitle>
        <CreditCard className="h-5 w-5 text-[#7F6DE7]" />
      </CardHeader>
      <CardContent>
        <div className="text-2xl font-bold">{team?.planName || 'Free'}</div>
        <div className="flex items-center gap-2 mt-1">
          <span className={`inline-block w-2 h-2 rounded-full ${isActive ? 'bg-green-400' : 'bg-gray-500'}`} />
          <span className="text-sm text-gray-400">
            {team?.subscriptionStatus === 'trialing' ? 'Trial' : isActive ? 'Active' : 'Inactive'}
          </span>
        </div>
        <form action={customerPortalAction} className="mt-3">
          <Button type="submit" variant="outline" size="sm" className="border-[#333] text-gray-300 hover:bg-[#2a2a2a]">
            Manage
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}

function RecentRuns() {
  const { data: runs } = useSWR<any[]>('/api/workflows/runs?limit=5', fetcher);

  return (
    <Card className="bg-[#222] border-[#333]">
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle className="text-sm font-medium text-gray-400">Recent Runs</CardTitle>
        <Link href="/dashboard/workflows" className="text-sm text-[#28B8F6] hover:underline">View all</Link>
      </CardHeader>
      <CardContent>
        {!runs || runs.length === 0 ? (
          <p className="text-gray-500 text-sm">No workflow runs yet.</p>
        ) : (
          <div className="space-y-3">
            {runs.map((run: any) => (
              <div key={run.id} className="flex items-center justify-between py-2 border-b border-[#333] last:border-0">
                <div className="flex items-center gap-3">
                  <Zap className="h-4 w-4 text-[#7F6DE7]" />
                  <div>
                    <p className="text-sm font-medium">{run.workflowName}</p>
                    <p className="text-xs text-gray-500">{run.model || 'default'}</p>
                  </div>
                </div>
                <span className={`text-xs px-2 py-1 rounded-full ${
                  run.status === 'succeeded' ? 'bg-green-500/10 text-green-400' :
                  run.status === 'failed' ? 'bg-red-500/10 text-red-400' :
                  run.status === 'running' ? 'bg-[#28B8F6]/10 text-[#28B8F6]' :
                  'bg-gray-500/10 text-gray-400'
                }`}>
                  {run.status}
                </span>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

function RecentTransactions() {
  const { data } = useSWR<{ balance: number; transactions: any[] }>('/api/credits/balance', fetcher);
  const transactions = data?.transactions || [];

  return (
    <Card className="bg-[#222] border-[#333]">
      <CardHeader>
        <CardTitle className="text-sm font-medium text-gray-400">Credit History</CardTitle>
      </CardHeader>
      <CardContent>
        {transactions.length === 0 ? (
          <p className="text-gray-500 text-sm">No transactions yet.</p>
        ) : (
          <div className="space-y-3">
            {transactions.slice(0, 8).map((tx: any) => (
              <div key={tx.id} className="flex items-center justify-between py-2 border-b border-[#333] last:border-0">
                <div className="flex items-center gap-3">
                  {tx.amount > 0 ? (
                    <ArrowUpRight className="h-4 w-4 text-green-400" />
                  ) : (
                    <ArrowDownRight className="h-4 w-4 text-red-400" />
                  )}
                  <div>
                    <p className="text-sm">{tx.reason}</p>
                    <p className="text-xs text-gray-500 flex items-center gap-1">
                      <Clock className="h-3 w-3" />
                      {new Date(tx.createdAt).toLocaleDateString()}
                    </p>
                  </div>
                </div>
                <span className={`text-sm font-mono font-semibold ${tx.amount > 0 ? 'text-green-400' : 'text-red-400'}`}>
                  {tx.amount > 0 ? '+' : ''}{tx.amount}
                </span>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

export default function DashboardPage() {
  return (
    <section className="flex-1 p-4 lg:p-8">
      <h1 className="text-2xl lg:text-3xl font-bold mb-8">Dashboard</h1>
      <div className="grid md:grid-cols-2 gap-6 mb-8">
        <Suspense fallback={<Card className="bg-[#222] border-[#333] h-[160px]" />}>
          <CreditBalance />
        </Suspense>
        <Suspense fallback={<Card className="bg-[#222] border-[#333] h-[160px]" />}>
          <SubscriptionStatus />
        </Suspense>
      </div>
      <div className="grid md:grid-cols-2 gap-6">
        <Suspense fallback={<Card className="bg-[#222] border-[#333] h-[300px]" />}>
          <RecentRuns />
        </Suspense>
        <Suspense fallback={<Card className="bg-[#222] border-[#333] h-[300px]" />}>
          <RecentTransactions />
        </Suspense>
      </div>
    </section>
  );
}
