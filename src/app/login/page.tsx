'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { BookOpen, User, Lock, ArrowRight, ShieldCheck, Eye, EyeOff } from 'lucide-react';
import { supabase, isSupabaseConfigured } from '@/lib/supabase';
import { ThemeToggle } from '@/components/ThemeToggle';

export default function LoginPage() {
  const router = useRouter();
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);

  const handleAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    const activeUser = username.trim() || 'Encoder';
    const generatedEmail = activeUser.toLowerCase().replace(/[^a-z0-9]/g, '') + '@hospital.com';

    // 1. Instant local state & storage set
    localStorage.setItem('philhealth_encoder', activeUser);
    localStorage.setItem('philhealth_user_email', generatedEmail);

    // 2. Instant redirect to main logbook page (Zero Delay)
    router.push('/');

    // 3. Non-blocking background sync with Supabase
    if (isSupabaseConfigured()) {
      (async () => {
        try {
          const { error: signInErr } = await supabase.auth.signInWithPassword({
            email: generatedEmail,
            password: password || 'default123',
          });

          if (signInErr) {
            await supabase.auth.signUp({
              email: generatedEmail,
              password: password || 'default123',
              options: {
                data: { encoder_name: activeUser },
              },
            });
          }
        } catch (err: any) {
          console.log('Background auth notice:', err.message);
        }
      })();
    }
  };

  return (
    <div className="min-h-screen flex flex-col justify-between p-4 sm:p-8 bg-slate-50 dark:bg-slate-950 transition-colors">
      
      {/* Top Header */}
      <div className="flex justify-between items-center w-full max-w-[98%] mx-auto px-2">
        <Link href="/" className="flex items-center gap-2 text-emerald-600 dark:text-emerald-400 font-bold text-lg">
          <BookOpen className="w-6 h-6" />
          <span>PhilHealth Logbook</span>
        </Link>
        <ThemeToggle />
      </div>

      {/* Main Login Card - Simplified (Username + Password only) */}
      <div className="max-w-md w-full mx-auto bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-6 sm:p-10 shadow-2xl space-y-6 my-auto">
        
        <div className="text-center space-y-2">
          <div className="inline-flex p-3.5 bg-emerald-100 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400 rounded-2xl mb-1">
            <ShieldCheck className="w-9 h-9" />
          </div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 dark:text-white tracking-tight">
            Encoder Portal Login
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400">
            PhilHealth Endorsement Data Entry & Daily Logbook
          </p>
        </div>

        <form onSubmit={handleAuth} className="space-y-4">
          
          {/* Username Field */}
          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-1.5">
              Username
            </label>
            <div className="relative">
              <User className="w-5 h-5 absolute left-3.5 top-3 text-slate-400" />
              <input
                type="text"
                required
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                placeholder="e.g. Admin, Juvy, Miko"
                className="w-full pl-11 pr-4 py-3 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl text-sm font-medium focus:outline-none focus:border-emerald-500 text-slate-900 dark:text-white"
              />
            </div>
          </div>

          {/* Password Field with Eye Toggle */}
          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-1.5">
              Password
            </label>
            <div className="relative">
              <Lock className="w-5 h-5 absolute left-3.5 top-3 text-slate-400" />
              <input
                type={showPassword ? 'text' : 'password'}
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                className="w-full pl-11 pr-12 py-3 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl text-sm font-medium focus:outline-none focus:border-emerald-500 text-slate-900 dark:text-white"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3.5 top-3 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 transition"
                title={showPassword ? 'Hide password' : 'Show password'}
              >
                {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
              </button>
            </div>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full py-3.5 bg-emerald-600 hover:bg-emerald-500 text-white font-bold rounded-2xl shadow-lg shadow-emerald-900/20 transition flex items-center justify-center gap-2 text-sm md:text-base mt-2"
          >
            {loading ? 'Logging in...' : 'Sign In'}
            <ArrowRight className="w-5 h-5" />
          </button>
        </form>

      </div>

      {/* Footer */}
      <footer className="text-center text-xs text-slate-400 py-3">
        PhilHealth Logbook Pro • Hospital Endorsement Management
      </footer>

    </div>
  );
}
