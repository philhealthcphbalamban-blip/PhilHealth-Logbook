'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { BookOpen, User, Lock, ArrowRight, ShieldCheck, KeyRound } from 'lucide-react';
import { supabase, isSupabaseConfigured } from '@/lib/supabase';
import { ThemeToggle } from '@/components/ThemeToggle';

export default function LoginPage() {
  const router = useRouter();
  const [isSignUp, setIsSignUp] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [encoderName, setEncoderName] = useState('Juvy');
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  const fillCredentials = (fillEmail: string, fillPass: string, fillName: string) => {
    setEmail(fillEmail);
    setPassword(fillPass);
    setEncoderName(fillName);
  };

  const handleAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setErrorMsg('');

    if (!isSupabaseConfigured()) {
      localStorage.setItem('philhealth_encoder', encoderName || email.split('@')[0]);
      localStorage.setItem('philhealth_user_email', email);
      router.push('/');
      return;
    }

    try {
      if (isSignUp) {
        const { error } = await supabase.auth.signUp({
          email,
          password,
          options: {
            data: { encoder_name: encoderName },
          },
        });
        if (error) throw error;
        alert('Account created! You can now log in.');
        setIsSignUp(false);
      } else {
        const { error } = await supabase.auth.signInWithPassword({
          email,
          password,
        });
        if (error) throw error;
        localStorage.setItem('philhealth_encoder', encoderName || email.split('@')[0]);
        router.push('/');
      }
    } catch (err: any) {
      setErrorMsg(err.message || 'Authentication failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex flex-col justify-between p-4 sm:p-6 bg-slate-50 dark:bg-slate-950 transition-colors">
      
      <div className="flex justify-between items-center max-w-5xl mx-auto w-full">
        <Link href="/" className="flex items-center gap-2 text-emerald-600 font-bold text-lg">
          <BookOpen className="w-5 h-5" />
          <span>PhilHealth Logbook</span>
        </Link>
        <ThemeToggle />
      </div>

      <div className="max-w-md w-full mx-auto bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-6 sm:p-8 shadow-2xl space-y-6">
        
        <div className="text-center space-y-2">
          <div className="inline-flex p-3 bg-emerald-100 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400 rounded-2xl mb-1">
            <ShieldCheck className="w-8 h-8" />
          </div>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-white">
            {isSignUp ? 'Create Encoder Account' : 'Encoder Portal Login'}
          </h1>
          <p className="text-xs text-slate-500 dark:text-slate-400">
            PhilHealth Endorsement Data Entry & Daily Logbook
          </p>
        </div>

        <div className="p-3 bg-slate-100 dark:bg-slate-800/60 rounded-2xl space-y-2 border border-slate-200 dark:border-slate-700/60">
          <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400 flex items-center gap-1.5">
            <KeyRound className="w-3.5 h-3.5 text-emerald-500" />
            Quick Demo Logins (1-Click Fill)
          </span>
          <div className="grid grid-cols-3 gap-1.5">
            <button
              type="button"
              onClick={() => fillCredentials('admin@hospital.com', 'admin123', 'Admin')}
              className="px-2 py-1.5 bg-purple-600/10 hover:bg-purple-600/20 text-purple-600 dark:text-purple-300 font-bold text-[11px] rounded-lg border border-purple-500/30 transition text-center"
            >
              ADMIN
            </button>
            <button
              type="button"
              onClick={() => fillCredentials('juvy@hospital.com', 'juvy123', 'Juvy')}
              className="px-2 py-1.5 bg-emerald-600/10 hover:bg-emerald-600/20 text-emerald-600 dark:text-emerald-300 font-bold text-[11px] rounded-lg border border-emerald-500/30 transition text-center"
            >
              JUVY (Encoder)
            </button>
            <button
              type="button"
              onClick={() => fillCredentials('miko@hospital.com', 'miko123', 'Miko')}
              className="px-2 py-1.5 bg-blue-600/10 hover:bg-blue-600/20 text-blue-600 dark:text-blue-300 font-bold text-[11px] rounded-lg border border-blue-500/30 transition text-center"
            >
              MIKO (Encoder)
            </button>
          </div>
        </div>

        {errorMsg && (
          <div className="p-3 bg-rose-100 dark:bg-rose-950/60 border border-rose-300 dark:border-rose-800 text-rose-700 dark:text-rose-300 rounded-xl text-xs font-medium">
            {errorMsg}
          </div>
        )}

        <form onSubmit={handleAuth} className="space-y-4">
          
          {isSignUp && (
            <div>
              <label className="block text-xs font-semibold uppercase text-slate-500 dark:text-slate-400 mb-1">
                Encoder / Employee Name
              </label>
              <div className="relative">
                <User className="w-4 h-4 absolute left-3.5 top-3 text-slate-400" />
                <input
                  type="text"
                  required
                  value={encoderName}
                  onChange={(e) => setEncoderName(e.target.value)}
                  placeholder="e.g. Juvy, Miko"
                  className="w-full pl-10 pr-4 py-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-sm focus:outline-none focus:border-emerald-500"
                />
              </div>
            </div>
          )}

          <div>
            <label className="block text-xs font-semibold uppercase text-slate-500 dark:text-slate-400 mb-1">
              Email Address
            </label>
            <div className="relative">
              <User className="w-4 h-4 absolute left-3.5 top-3 text-slate-400" />
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="encoder@hospital.com"
                className="w-full pl-10 pr-4 py-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-sm focus:outline-none focus:border-emerald-500"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold uppercase text-slate-500 dark:text-slate-400 mb-1">
              Password
            </label>
            <div className="relative">
              <Lock className="w-4 h-4 absolute left-3.5 top-3 text-slate-400" />
              <input
                type="password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                className="w-full pl-10 pr-4 py-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-sm focus:outline-none focus:border-emerald-500"
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full py-3 bg-emerald-600 hover:bg-emerald-500 text-white font-bold rounded-xl shadow-lg shadow-emerald-900/20 transition flex items-center justify-center gap-2 text-sm"
          >
            {loading ? 'Processing...' : isSignUp ? 'Sign Up' : 'Sign In'}
            <ArrowRight className="w-4 h-4" />
          </button>
        </form>

        <div className="text-center text-xs text-slate-500 dark:text-slate-400 pt-2 border-t border-slate-100 dark:border-slate-800">
          {isSignUp ? (
            <span>
              Already have an account?{' '}
              <button
                type="button"
                onClick={() => setIsSignUp(false)}
                className="text-emerald-600 font-bold hover:underline"
              >
                Sign In
              </button>
            </span>
          ) : (
            <span>
              Need an account?{' '}
              <button
                type="button"
                onClick={() => setIsSignUp(true)}
                className="text-emerald-600 font-bold hover:underline"
              >
                Sign Up
              </button>
            </span>
          )}
        </div>

      </div>

      <footer className="text-center text-xs text-slate-400 py-2">
        PhilHealth Logbook Pro • Hospital Endorsement Management
      </footer>

    </div>
  );
}
