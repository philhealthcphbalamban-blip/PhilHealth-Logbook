'use client';

import React from 'react';
import Link from 'next/link';
import { ThemeToggle } from './ThemeToggle';
import { BookOpen, LogOut, User, Download, CloudCheck, HardDrive } from 'lucide-react';
import { isSupabaseConfigured } from '@/lib/supabase';

interface NavbarProps {
  userEmail?: string;
  onExportExcel?: () => void;
  onLogout?: () => void;
}

export function Navbar({ userEmail, onExportExcel, onLogout }: NavbarProps) {
  const hasCloud = isSupabaseConfigured();

  return (
    <header className="sticky top-0 z-40 bg-white/90 dark:bg-slate-900/90 backdrop-blur border-b border-slate-200 dark:border-slate-800 transition-colors">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between gap-4">
        
        <Link href="/" className="flex items-center gap-3 group">
          <div className="p-2 bg-emerald-600 text-white rounded-xl shadow-md group-hover:bg-emerald-500 transition">
            <BookOpen className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="font-bold text-lg text-slate-900 dark:text-white tracking-tight">
                PhilHealth Logbook
              </span>
              <span className="text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 rounded-full bg-emerald-100 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-400 border border-emerald-300 dark:border-emerald-800">
                Hospital Pro
              </span>
            </div>
            <p className="text-xs text-slate-500 dark:text-slate-400 font-medium hidden sm:block">
              Daily Endorsement System (ADM / PAIN / MINOR / DENT / OECB)
            </p>
          </div>
        </Link>

        <div className="flex items-center gap-3">
          <div className="hidden md:flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold border bg-slate-100 dark:bg-slate-800/80 border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300">
            {hasCloud ? (
              <>
                <CloudCheck className="w-3.5 h-3.5 text-emerald-500" />
                <span>Supabase Live</span>
              </>
            ) : (
              <>
                <HardDrive className="w-3.5 h-3.5 text-amber-500" />
                <span>Local Mode</span>
              </>
            )}
          </div>

          <ThemeToggle />

          {onExportExcel && (
            <button
              onClick={onExportExcel}
              className="flex items-center gap-2 bg-emerald-600 hover:bg-emerald-500 text-white px-3.5 py-2 rounded-xl text-xs font-semibold shadow-md transition"
            >
              <Download className="w-4 h-4" />
              <span className="hidden sm:inline">Export Excel</span>
            </button>
          )}

          {userEmail ? (
            <div className="flex items-center gap-2 pl-2 border-l border-slate-200 dark:border-slate-800">
              <div className="flex items-center gap-1.5 text-xs text-slate-700 dark:text-slate-300 font-medium">
                <User className="w-4 h-4 text-emerald-500" />
                <span className="hidden lg:inline">{userEmail}</span>
              </div>
              {onLogout && (
                <button
                  onClick={onLogout}
                  className="p-2 text-slate-400 hover:text-rose-500 transition"
                  title="Logout"
                >
                  <LogOut className="w-4 h-4" />
                </button>
              )}
            </div>
          ) : (
            <Link
              href="/login"
              className="flex items-center gap-1.5 bg-slate-900 dark:bg-slate-100 text-white dark:text-slate-900 px-3.5 py-2 rounded-xl text-xs font-semibold hover:bg-slate-800 dark:hover:bg-white transition"
            >
              <User className="w-4 h-4" />
              <span>Login</span>
            </Link>
          )}

        </div>

      </div>
    </header>
  );
}
