'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { BookOpen, User, Lock, ArrowRight, ShieldCheck, Eye, EyeOff, AlertCircle } from 'lucide-react';
import { supabase, isSupabaseConfigured } from '@/lib/supabase';
import { ThemeToggle } from '@/components/ThemeToggle';

export default function LoginPage() {
  const router = useRouter();
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  const handleAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg('');

    const activeUser = username.trim();
    const enteredPass = password.trim();

    if (!activeUser || !enteredPass) {
      setErrorMsg('Please enter both your Username and Password.');
      return;
    }

    setLoading(true);

    const generatedEmail = activeUser.toLowerCase().includes('@')
      ? activeUser.toLowerCase()
      : activeUser.toLowerCase().replace(/[^a-z0-9]/g, '') + '@hospital.com';

    const isAdmin = activeUser.toLowerCase().includes('admin');

    // 1. Local Password Map verification
    const passMap = JSON.parse(localStorage.getItem('philhealth_user_passwords') || '{}');
    const storedPass = passMap[activeUser.toLowerCase()] || passMap[generatedEmail.toLowerCase()];

    if (storedPass && storedPass !== enteredPass) {
      setLoading(false);
      setErrorMsg('❌ Incorrect password! Please enter your valid account password.');
      return;
    }

    // 2. Cloud Authentication if Supabase is enabled
    if (isSupabaseConfigured()) {
      try {
        const { error: signInErr } = await supabase.auth.signInWithPassword({
          email: generatedEmail,
          password: enteredPass,
        });

        if (signInErr) {
          // If credentials don't match existing account in Supabase
          if (signInErr.message.toLowerCase().includes('invalid login credentials') || signInErr.status === 400) {
            // Attempt auto signup for fresh initial account
            if (!storedPass) {
              const { error: signUpErr } = await supabase.auth.signUp({
                email: generatedEmail,
                password: enteredPass,
                options: {
                  data: { encoder_name: activeUser },
                },
              });
              if (signUpErr && signUpErr.message.toLowerCase().includes('already registered')) {
                setLoading(false);
                setErrorMsg('❌ Incorrect password! Please enter the correct password.');
                return;
              }
            } else {
              setLoading(false);
              setErrorMsg('❌ Incorrect password! Please check your credentials.');
              return;
            }
          }
        }
      } catch (err) {
        // Fallthrough if network issue
      }
    }

    // 3. Save initial password to local map if new account
    if (!storedPass) {
      passMap[activeUser.toLowerCase()] = enteredPass;
      passMap[generatedEmail.toLowerCase()] = enteredPass;
      localStorage.setItem('philhealth_user_passwords', JSON.stringify(passMap));
    }

    // 4. Save Session Credentials & Redirect
    localStorage.setItem('philhealth_encoder', activeUser);
    localStorage.setItem('philhealth_user_email', generatedEmail);
    localStorage.setItem('philhealth_user_role', isAdmin ? 'ADMIN' : 'ENCODER');

    window.location.href = '/';
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

        {errorMsg && (
          <div className="p-3.5 bg-rose-100 dark:bg-rose-950/80 border border-rose-300 dark:border-rose-800 text-rose-700 dark:text-rose-300 rounded-2xl text-xs sm:text-sm font-bold flex items-center gap-2">
            <AlertCircle className="w-5 h-5 flex-shrink-0 text-rose-500" />
            <span>{errorMsg}</span>
          </div>
        )}

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
            {loading ? 'Verifying Password...' : 'Sign In'}
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
