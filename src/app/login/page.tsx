"use client";

import React, { useState, Suspense } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useAuth } from "@/context/AuthContext";
import { Cake, Lock, Mail, ArrowRight, ShieldCheck, User } from "lucide-react";

function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const redirectUrl = searchParams.get("redirect") || "/";

  const { login } = useAuth();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    const result = await login(email, password);
    if (result.success) {
      router.push(redirectUrl);
    } else {
      setError(result.error || "Invalid credentials.");
      setLoading(false);
    }
  };

  const handleQuickDemoLogin = async (demoEmail: string, demoPass: string) => {
    setEmail(demoEmail);
    setPassword(demoPass);
    setLoading(true);
    setError(null);
    const result = await login(demoEmail, demoPass);
    if (result.success) {
      if (demoEmail.includes("baker") && redirectUrl === "/") {
        router.push("/baker");
      } else {
        router.push(redirectUrl);
      }
    } else {
      setError(result.error || "Quick demo login failed.");
      setLoading(false);
    }
  };

  return (
    <div className="max-w-md w-full bg-white rounded-3xl border border-stone-200 p-8 shadow-sm space-y-6">
      <div className="text-center space-y-2">
        <div className="w-12 h-12 rounded-2xl bg-amber-700/10 border border-amber-600/20 text-amber-800 flex items-center justify-center mx-auto">
          <Cake className="w-6 h-6" />
        </div>
        <h1 className="font-serif text-2xl font-bold text-stone-900">Welcome Back</h1>
        <p className="text-xs text-stone-500">Sign in to manage your cake reservations and orders.</p>
      </div>

      {error && (
        <div className="p-3.5 rounded-xl bg-red-50 border border-red-200 text-red-700 text-xs">
          {error}
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="block text-xs font-semibold text-stone-700 mb-1">Email Address</label>
          <div className="relative">
            <Mail className="w-4 h-4 text-stone-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
            <input
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="name@example.com"
              className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-stone-200 text-sm focus:outline-none focus:ring-2 focus:ring-amber-700/20 focus:border-amber-700"
            />
          </div>
        </div>

        <div>
          <label className="block text-xs font-semibold text-stone-700 mb-1">Password</label>
          <div className="relative">
            <Lock className="w-4 h-4 text-stone-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
            <input
              type="password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
              className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-stone-200 text-sm focus:outline-none focus:ring-2 focus:ring-amber-700/20 focus:border-amber-700"
            />
          </div>
        </div>

        <button
          type="submit"
          disabled={loading}
          className="w-full py-3 rounded-xl bg-amber-700 hover:bg-amber-800 text-white font-semibold text-sm shadow-md transition-all flex items-center justify-center gap-2"
        >
          <span>{loading ? "Authenticating..." : "Sign In"}</span>
          <ArrowRight className="w-4 h-4" />
        </button>
      </form>

      {/* Quick Demo Logins for Pair Programming & Testing */}
      <div className="pt-4 border-t border-stone-100 space-y-2">
        <span className="block text-[11px] font-bold text-stone-400 uppercase tracking-wider text-center">
          One-Click Test Accounts
        </span>
        <div className="grid grid-cols-2 gap-2">
          <button
            type="button"
            onClick={() => handleQuickDemoLogin("baker@cakecart.local", "bakerpass123")}
            className="p-2.5 rounded-xl border border-amber-200 bg-amber-50/70 hover:bg-amber-100/80 text-amber-900 text-xs font-medium flex items-center justify-center gap-1.5 transition-colors"
          >
            <ShieldCheck className="w-4 h-4 text-amber-700" />
            <span>Baker Portal</span>
          </button>
          <button
            type="button"
            onClick={() => handleQuickDemoLogin("customer@cakecart.local", "customerpass123")}
            className="p-2.5 rounded-xl border border-stone-200 bg-stone-50 hover:bg-stone-100 text-stone-800 text-xs font-medium flex items-center justify-center gap-1.5 transition-colors"
          >
            <User className="w-4 h-4 text-stone-600" />
            <span>Customer</span>
          </button>
        </div>
      </div>

      <div className="text-center text-xs text-stone-500">
        Don&apos;t have an account?{" "}
        <Link href={`/register?redirect=${redirectUrl}`} className="text-amber-800 font-semibold hover:underline">
          Register here
        </Link>
      </div>
    </div>
  );
}

export default function LoginPage() {
  return (
    <div className="min-h-[80vh] flex items-center justify-center px-4 py-12">
      <Suspense fallback={<div className="text-stone-500 text-sm">Loading sign in...</div>}>
        <LoginForm />
      </Suspense>
    </div>
  );
}
