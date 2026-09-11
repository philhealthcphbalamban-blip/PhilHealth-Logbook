'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { ThemeToggle } from './ThemeToggle';
import { BookOpen, LogOut, User, Download, Cloud, HardDrive, ShieldAlert, Menu, X } from 'lucide-react';
import { supabase, isSupabaseConfigured } from '@/lib/supabase';

interface NavbarProps {
  userEmail?: string;
  onExportExcel?: () => void;
}

export function Navbar({ userEmail, onExportExcel }: NavbarProps) {
  const router = useRouter();
  const hasCloud = isSupabaseConfigured();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const handleLogout = async () => {
    localStorage.removeItem('philhealth_encoder');
    localStorage.removeItem('philhealth_user_email');
    if (hasCloud) {
      try {
        await supabase.auth.signOut();
      } catch (e) {}
    }
    router.push('/login');
  };

  return (
    <header className="sticky top-0 z-40 bg-white/95 dark:bg-slate-900/95 backdrop-blur border-b border-slate-200/80 dark:border-slate-800/80 transition-colors shadow-sm">
      <div className="max-w-[98%] mx-auto px-3 sm:px-6 h-16 flex items-center justify-between gap-4">
        
        {/* Brand */}
        <Link href="/" className="flex items-center gap-3 group">
          <div className="p-2.5 bg-emerald-600 dark:bg-emerald-500 text-white rounded-xl shadow-md group-hover:bg-emerald-500 dark:group-hover:bg-emerald-400 transition">
            <BookOpen className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="font-extrabold text-base md:text-lg text-slate-900 dark:text-white tracking-tight">
                PhilHealth Logbook
              </span>
              <span className="text-[10px] uppercase font-extrabold tracking-wider px-2 py-0.5 rounded-full bg-emerald-100 dark:bg-emerald-950/80 text-emerald-700 dark:text-emerald-300 border border-emerald-300 dark:border-emerald-800">
                Pro
              </span>
            </div>
            <p className="text-xs text-slate-500 dark:text-slate-400 font-medium hidden md:block">
              Hospital Endorsement System
            </p>
          </div>
        </Link>

        {/* Desktop Controls */}
        <div className="hidden md:flex items-center gap-3">
          <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold border bg-slate-100 dark:bg-slate-800/80 border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300">
            {hasCloud ? (
              <>
                <Cloud className="w-4 h-4 text-emerald-500" />
                <span>Supabase Live</span>
              </>
            ) : (
              <>
                <HardDrive className="w-4 h-4 text-amber-500" />
                <span>Local Storage</span>
              </>
            )}
          </div>

          <ThemeToggle />

          <Link
            href="/admin"
            className="flex items-center gap-1.5 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 px-3.5 py-2 rounded-xl text-xs font-bold transition border border-slate-200 dark:border-slate-700"
          >
            <ShieldAlert className="w-4 h-4 text-emerald-500" />
            <span>Admin Settings</span>
          </Link>

          {onExportExcel && (
            <button
              onClick={onExportExcel}
              className="flex items-center gap-2 bg-emerald-600 hover:bg-emerald-500 text-white px-4 py-2 rounded-xl text-xs font-bold shadow-md transition"
            >
              <Download className="w-4 h-4" />
              <span>Export Excel</span>
            </button>
          )}

          {/* Prominent Logout Button */}
          <button
            onClick={handleLogout}
            className="flex items-center gap-1.5 bg-rose-50 hover:bg-rose-100 dark:bg-rose-950/40 dark:hover:bg-rose-900/60 text-rose-600 dark:text-rose-400 border border-rose-200 dark:border-rose-800/60 px-3.5 py-2 rounded-xl text-xs font-bold transition"
            title="Logout of Encoder Portal"
          >
            <LogOut className="w-4 h-4" />
            <span>Logout</span>
          </button>
        </div>

        {/* Mobile Hamburger Button */}
        <div className="flex items-center gap-2 md:hidden">
          <ThemeToggle />
          <button
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            className="p-2 text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl"
          >
            {mobileMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
          </button>
        </div>

      </div>

      {/* Mobile Drawer Menu */}
      {mobileMenuOpen && (
        <div className="md:hidden border-b border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-4 space-y-3 shadow-lg">
          <Link
            href="/admin"
            onClick={() => setMobileMenuOpen(false)}
            className="flex items-center gap-2 w-full p-3 bg-slate-100 dark:bg-slate-800 rounded-xl text-xs font-bold text-slate-800 dark:text-slate-200"
          >
            <ShieldAlert className="w-4 h-4 text-emerald-500" />
            <span>Admin Settings</span>
          </Link>

          {onExportExcel && (
            <button
              onClick={() => { onExportExcel(); setMobileMenuOpen(false); }}
              className="flex items-center gap-2 w-full p-3 bg-emerald-600 text-white rounded-xl text-xs font-bold"
            >
              <Download className="w-4 h-4" />
              <span>Export Excel (.xlsx)</span>
            </button>
          )}

          <button
            onClick={() => { handleLogout(); setMobileMenuOpen(false); }}
            className="flex items-center gap-2 w-full p-3 bg-rose-100 dark:bg-rose-950/60 text-rose-600 dark:text-rose-400 rounded-xl text-xs font-bold"
          >
            <LogOut className="w-4 h-4" />
            <span>Logout</span>
          </button>
        </div>
      )}

    </header>
  );
}
