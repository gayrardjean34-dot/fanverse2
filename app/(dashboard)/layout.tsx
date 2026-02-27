'use client';

import Link from 'next/link';
import { useState, Suspense } from 'react';
import { Button } from '@/components/ui/button';
import { Home, LogOut, Sparkles, CreditCard, Cpu, Workflow, Menu, X, Paintbrush, Coins } from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { signOut } from '@/app/(login)/actions';
import { useRouter, usePathname } from 'next/navigation';
import { User } from '@/lib/db/schema';
import useSWR, { mutate } from 'swr';

const fetcher = (url: string) => fetch(url).then((res) => res.json());

const navLinks = [
  { href: '/pricing', label: 'Pricing', icon: CreditCard },
  { href: '/dashboard', label: 'Dashboard', icon: Home },
  { href: '/dashboard/studio', label: 'Studio', icon: Paintbrush },
  { href: '/dashboard/workflows', label: 'Workflows', icon: Workflow },
  { href: '/dashboard/models', label: 'Models', icon: Cpu },
];

function UserMenu() {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const { data: user } = useSWR<User>('/api/user', fetcher);
  const router = useRouter();

  async function handleSignOut() {
    await signOut();
    mutate('/api/user');
    router.push('/');
  }

  if (!user) {
    return (
      <div className="flex items-center gap-3">
        <Link href="/pricing" className="text-sm text-gray-400 hover:text-[#28B8F6] transition-colors">
          Pricing
        </Link>
        <Button asChild className="rounded-full bg-[#28B8F6] hover:bg-[#28B8F6]/80 text-[#191919] font-semibold">
          <Link href="/sign-up">Get Started</Link>
        </Button>
      </div>
    );
  }

  return (
    <DropdownMenu open={isMenuOpen} onOpenChange={setIsMenuOpen}>
      <DropdownMenuTrigger>
        <Avatar className="cursor-pointer size-9 ring-2 ring-[#28B8F6]/30">
          <AvatarImage alt={user.name || ''} />
          <AvatarFallback className="bg-[#28B8F6]/20 text-[#28B8F6]">
            {(user.name || user.email).split(' ').map((n) => n[0]).join('').toUpperCase()}
          </AvatarFallback>
        </Avatar>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="flex flex-col gap-1 bg-[#222] border-[#333]">
        <DropdownMenuItem className="cursor-pointer text-[#FEFEFE] focus:bg-[#333] focus:text-[#FEFEFE]">
          <Link href="/dashboard" className="flex w-full items-center">
            <Home className="mr-2 h-4 w-4" />
            <span>Dashboard</span>
          </Link>
        </DropdownMenuItem>
        <form action={handleSignOut} className="w-full">
          <button type="submit" className="flex w-full">
            <DropdownMenuItem className="w-full flex-1 cursor-pointer text-[#FEFEFE] focus:bg-[#333] focus:text-[#FEFEFE]">
              <LogOut className="mr-2 h-4 w-4" />
              <span>Sign out</span>
            </DropdownMenuItem>
          </button>
        </form>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

function CreditBadge() {
  const { data } = useSWR<{ balance: number }>('/api/credits/balance', fetcher, { refreshInterval: 10000 });
  const { data: user } = useSWR<User>('/api/user', fetcher);

  if (!user) return null;

  const balance = data?.balance ?? 0;

  return (
    <Link href="/pricing" className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-[#222] border border-[#333] hover:border-[#28B8F6]/30 transition-colors">
      <Coins className="h-4 w-4 text-[#28B8F6]" />
      <span className="text-sm font-semibold text-[#FEFEFE]">{balance}</span>
      <span className="text-xs text-gray-500 hidden sm:inline">credits</span>
    </Link>
  );
}

function Header() {
  const pathname = usePathname();
  const [mobileOpen, setMobileOpen] = useState(false);

  return (
    <header className="border-b border-[#333] bg-[#191919]/95 backdrop-blur-md sticky top-0 z-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 flex justify-between items-center">
        <div className="flex items-center gap-8">
          <Link href="/" className="flex items-center gap-2">
            <Sparkles className="h-6 w-6 text-[#28B8F6]" />
            <span className="text-xl font-bold fan-gradient-text">Fanverse</span>
          </Link>
          <nav className="hidden md:flex items-center gap-1">
            {navLinks.map((link) => {
              const isActive = pathname === link.href || (link.href !== '/' && pathname?.startsWith(link.href));
              return (
                <Link
                  key={link.href}
                  href={link.href}
                  className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
                    isActive
                      ? 'text-[#28B8F6] bg-[#28B8F6]/10'
                      : 'text-gray-400 hover:text-[#FEFEFE] hover:bg-[#2a2a2a]'
                  }`}
                >
                  {link.label}
                </Link>
              );
            })}
          </nav>
        </div>
        <div className="flex items-center gap-3">
          <Suspense fallback={null}>
            <CreditBadge />
          </Suspense>
          <Suspense fallback={<div className="h-9" />}>
            <UserMenu />
          </Suspense>
          <button className="md:hidden text-gray-400" onClick={() => setMobileOpen(!mobileOpen)}>
            {mobileOpen ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
          </button>
        </div>
      </div>
      {mobileOpen && (
        <nav className="md:hidden border-t border-[#333] px-4 py-3 flex flex-col gap-1">
          {navLinks.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              onClick={() => setMobileOpen(false)}
              className="px-3 py-2 rounded-lg text-sm text-gray-400 hover:text-[#FEFEFE] hover:bg-[#2a2a2a]"
            >
              {link.label}
            </Link>
          ))}
        </nav>
      )}
    </header>
  );
}

export default function Layout({ children }: { children: React.ReactNode }) {
  return (
    <section className="flex flex-col min-h-screen bg-[#191919]">
      <Header />
      {children}
    </section>
  );
}
