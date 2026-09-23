"use client";

import Link from "next/link";
import { useAuth } from "@/context/AuthContext";
import { useCart } from "@/context/CartContext";
import { ShoppingBag, Cake, User, LogOut, ShieldCheck, Menu, X } from "lucide-react";
import { useState } from "react";

export function Navbar() {
  const { user, logout } = useAuth();
  const { totalCakesCount } = useCart();
  const [mobileOpen, setMobileOpen] = useState(false);

  return (
    <header className="sticky top-0 z-40 glass-header">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-20">
          {/* Logo */}
          <Link href="/" className="flex items-center gap-3 group">
            <div className="w-11 h-11 rounded-2xl bg-amber-700/10 border border-amber-600/20 flex items-center justify-center text-amber-700 group-hover:bg-amber-700 group-hover:text-white transition-all shadow-sm">
              <Cake className="w-6 h-6 transition-transform group-hover:scale-110" />
            </div>
            <div>
              <span className="font-serif text-2xl font-bold tracking-tight text-stone-900 group-hover:text-amber-800 transition-colors">
                CakeCart
              </span>
              <span className="block text-[10px] uppercase font-semibold tracking-widest text-amber-800/70 -mt-1">
                Artisan Home Bakery
              </span>
            </div>
          </Link>

          {/* Desktop Navigation */}
          <nav className="hidden md:flex items-center gap-8">
            <Link
              href="/menu"
              className="text-stone-700 hover:text-amber-800 font-medium transition-colors text-sm"
            >
              Order Cakes
            </Link>
            <Link
              href="/orders"
              className="text-stone-700 hover:text-amber-800 font-medium transition-colors text-sm"
            >
              My Orders
            </Link>
            {user && (user.role === "BAKER" || user.role === "ADMIN") && (
              <Link
                href="/baker"
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-amber-100/70 text-amber-900 text-xs font-semibold hover:bg-amber-200/80 transition-colors border border-amber-200"
              >
                <ShieldCheck className="w-4 h-4 text-amber-700" />
                Baker Dashboard
              </Link>
            )}
          </nav>

          {/* Right Action Icons */}
          <div className="flex items-center gap-4">
            {/* Cart Icon Button */}
            <Link
              href="/cart"
              className="relative p-2.5 rounded-xl text-stone-700 hover:bg-amber-100/50 hover:text-amber-900 transition-all"
              aria-label="View Shopping Cart"
            >
              <ShoppingBag className="w-5 h-5" />
              {totalCakesCount > 0 && (
                <span className="absolute -top-1 -right-1 bg-amber-700 text-white font-bold text-[11px] w-5 h-5 rounded-full flex items-center justify-center shadow-md animate-in zoom-in-50">
                  {totalCakesCount}
                </span>
              )}
            </Link>

            {/* Auth Dropdown / Buttons */}
            {user ? (
              <div className="hidden sm:flex items-center gap-3 pl-2 border-l border-stone-200">
                <div className="text-right">
                  <div className="text-xs font-semibold text-stone-900 leading-tight">
                    {user.name}
                  </div>
                  <div className="text-[10px] text-stone-500 font-medium capitalize">
                    {user.role.toLowerCase()}
                  </div>
                </div>
                <button
                  onClick={logout}
                  title="Logout"
                  className="p-2 rounded-lg text-stone-500 hover:bg-red-50 hover:text-red-700 transition-colors"
                >
                  <LogOut className="w-4 h-4" />
                </button>
              </div>
            ) : (
              <div className="hidden sm:flex items-center gap-2 pl-2 border-l border-stone-200">
                <Link
                  href="/login"
                  className="px-4 py-2 rounded-xl text-stone-700 hover:text-stone-900 font-medium text-sm transition-colors"
                >
                  Log in
                </Link>
                <Link
                  href="/register"
                  className="px-4 py-2 rounded-xl bg-amber-700 text-white font-medium text-sm hover:bg-amber-800 transition-all shadow-sm"
                >
                  Register
                </Link>
              </div>
            )}

            {/* Mobile menu trigger */}
            <button
              onClick={() => setMobileOpen(!mobileOpen)}
              className="md:hidden p-2 rounded-lg text-stone-700 hover:bg-stone-100"
            >
              {mobileOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
            </button>
          </div>
        </div>
      </div>

      {/* Mobile Drawer */}
      {mobileOpen && (
        <div className="md:hidden border-t border-stone-200 bg-white/95 px-4 pt-3 pb-6 space-y-3">
          <Link
            href="/menu"
            onClick={() => setMobileOpen(false)}
            className="block px-3 py-2 rounded-lg font-medium text-stone-800 hover:bg-amber-50"
          >
            Order Cakes
          </Link>
          <Link
            href="/orders"
            onClick={() => setMobileOpen(false)}
            className="block px-3 py-2 rounded-lg font-medium text-stone-800 hover:bg-amber-50"
          >
            My Orders
          </Link>
          {user && (user.role === "BAKER" || user.role === "ADMIN") && (
            <Link
              href="/baker"
              onClick={() => setMobileOpen(false)}
              className="block px-3 py-2 rounded-lg font-semibold text-amber-900 bg-amber-50"
            >
              Baker Dashboard
            </Link>
          )}

          <div className="pt-3 border-t border-stone-100">
            {user ? (
              <div className="flex items-center justify-between px-3">
                <div>
                  <div className="font-semibold text-stone-900">{user.name}</div>
                  <div className="text-xs text-stone-500">{user.email}</div>
                </div>
                <button
                  onClick={() => {
                    setMobileOpen(false);
                    logout();
                  }}
                  className="px-3 py-1.5 text-xs rounded-lg text-red-600 bg-red-50 font-medium"
                >
                  Log out
                </button>
              </div>
            ) : (
              <div className="grid grid-cols-2 gap-2 px-2">
                <Link
                  href="/login"
                  onClick={() => setMobileOpen(false)}
                  className="text-center py-2 rounded-lg border border-stone-300 text-stone-700 font-medium text-sm"
                >
                  Log in
                </Link>
                <Link
                  href="/register"
                  onClick={() => setMobileOpen(false)}
                  className="text-center py-2 rounded-lg bg-amber-700 text-white font-medium text-sm"
                >
                  Register
                </Link>
              </div>
            )}
          </div>
        </div>
      )}
    </header>
  );
}
