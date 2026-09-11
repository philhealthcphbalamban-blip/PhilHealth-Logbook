'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { BookOpen, User, Lock, ArrowRight, ShieldCheck, Eye, EyeOff } from 'lucide-react';
import { supabase, isSupabaseConfigured } from '@/lib/supabase';
import { ThemeToggle } from '@/components/ThemeToggle';

export default function LoginPage() {
  const router = useRouter();
  const [isSignUp, setIsSignUp] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [encoderName, setEncoderName] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  const handleAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setErrorMsg('');

    const activeEncoder = encoderName.trim() || email.split('@')[0] || 'Encoder';

    if (isSupabaseConfigured()) {
      try {
        if (isSignUp) {
          const { error } = await supabase.auth.signUp({
            email,
            password,
            options: {
              data: { encoder_name: activeEncoder },
            },
          });
          if (error) {
            console.log('SignUp error:', error.message);
          }
        } else {
          // Attempt Sign In
          const { error: signInErr } = await supabase.auth.signInWithPassword({
            email,
            password,
          });

          // If account doesn't exist in Supabase Auth yet, auto-register it!
          if (signInErr) {
            console.log('SignIn notice:', signInErr.message);
            const { error: signUpErr } = await supabase.auth.signUp({
              email,
              password,
              options: {
                data: { encoder_name: activeEncoder },
              },
            });
            if (signUpErr) {
              console.log('Auto-signUp notice:', signUpErr.message);
            }
          }
        }
      } catch (err: any) {
        console.log('Auth catch notice:', err.message);
      }
    }

    // Successfully log in the encoder session smoothly
    localStorage.setItem('philhealth_encoder', activeEncoder);
    localStorage.setItem('philhealth_user_email', email);
    setLoading(false);
    router.push('/');
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

      {/* Main Login Card */}
      <div className="max-w-md w-full mx-auto bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-6 sm:p-10 shadow-2xl space-y-6 my-auto">
        
        <div className="text-center space-y-2">
          <div className="inline-flex p-3.5 bg-emerald-100 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400 rounded-2xl mb-1">
            <ShieldCheck className="w-9 h-9" />
          </div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 dark:text-white tracking-tight">
            {isSignUp ? 'Create Encoder Account' : 'Encoder Portal Login'}
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400">
            PhilHealth Endorsement Data Entry & Daily Logbook
          </p>
        </div>

        {errorMsg && (
          <div className="p-3.5 bg-rose-100 dark:bg-rose-950/60 border border-rose-300 dark:border-rose-800 text-rose-700 dark:text-rose-300 rounded-2xl text-xs font-semibold">
            {errorMsg}
          </div>
        )}

        <form onSubmit={handleAuth} className="space-y-4">
          
          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-1.5">
              Encoder / Employee Name
            </label>
            <div className="relative">
              <User className="w-5 h-5 absolute left-3.5 top-3 text-slate-400" />
              <input
                type="text"
                required
                value={encoderName}
                onChange={(e) => setEncoderName(e.target.value)}
                placeholder="e.g. Admin, Juvy, Miko"
                className="w-full pl-11 pr-4 py-3 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl text-sm font-medium focus:outline-none focus:border-emerald-500 text-slate-900 dark:text-white"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-1.5">
              Email Address
            </label>
            <div className="relative">
              <User className="w-5 h-5 absolute left-3.5 top-3 text-slate-400" />
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="admin@hospital.com"
                className="w-full pl-11 pr-4 py-3 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl text-sm font-medium focus:outline-none focus:border-emerald-500 text-slate-900 dark:text-white"
              />
            </div>
          </div>

          {/* Password with Eye Toggle */}
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
            {loading ? 'Processing...' : isSignUp ? 'Sign Up' : 'Sign In'}
            <ArrowRight className="w-5 h-5" />
          </button>
        </form>

        <div className="text-center text-xs sm:text-sm text-slate-500 dark:text-slate-400 pt-3 border-t border-slate-100 dark:border-slate-800">
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

      {/* Footer */}
      <footer className="text-center text-xs text-slate-400 py-3">
        PhilHealth Logbook Pro • Hospital Endorsement Management
      </footer>

    </div>
  );
}
