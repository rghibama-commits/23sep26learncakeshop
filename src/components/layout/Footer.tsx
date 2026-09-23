import Link from "next/link";
import { Cake, Clock, MapPin, HeartHandshake, ShieldCheck } from "lucide-react";

export function Footer() {
  return (
    <footer className="bg-stone-900 text-stone-300 pt-16 pb-12 mt-24 border-t border-amber-950/40">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-10 pb-12 border-b border-stone-800">
          {/* Brand info */}
          <div className="md:col-span-1 space-y-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center text-amber-500">
                <Cake className="w-5 h-5" />
              </div>
              <span className="font-serif text-2xl font-bold text-white tracking-tight">CakeCart</span>
            </div>
            <p className="text-stone-400 text-sm leading-relaxed">
              Handcrafted small-batch celebration cakes, French pastries, and allergen-conscious creations baked fresh to order in our artisanal studio.
            </p>
          </div>

          {/* Bakery Promise */}
          <div className="space-y-3">
            <h4 className="text-white font-semibold text-sm tracking-wider uppercase">Our Policy</h4>
            <ul className="space-y-2.5 text-sm text-stone-400">
              <li className="flex items-center gap-2">
                <Clock className="w-4 h-4 text-amber-500 shrink-0" />
                <span>48-Hour Minimum Lead Time</span>
              </li>
              <li className="flex items-center gap-2">
                <HeartHandshake className="w-4 h-4 text-amber-500 shrink-0" />
                <span>24-Hour Cancellation Cut-Off</span>
              </li>
              <li className="flex items-center gap-2">
                <ShieldCheck className="w-4 h-4 text-amber-500 shrink-0" />
                <span>Daily Small-Batch Capacity Cap</span>
              </li>
            </ul>
          </div>

          {/* Quick links */}
          <div className="space-y-3">
            <h4 className="text-white font-semibold text-sm tracking-wider uppercase">Quick Links</h4>
            <ul className="space-y-2 text-sm text-stone-400">
              <li>
                <Link href="/menu" className="hover:text-amber-400 transition-colors">
                  Artisan Menu & Catalog
                </Link>
              </li>
              <li>
                <Link href="/orders" className="hover:text-amber-400 transition-colors">
                  Order Tracking & QR
                </Link>
              </li>
              <li>
                <Link href="/baker" className="hover:text-amber-400 transition-colors">
                  Baker Studio Portal
                </Link>
              </li>
            </ul>
          </div>

          {/* Pickup studio address */}
          <div className="space-y-3">
            <h4 className="text-white font-semibold text-sm tracking-wider uppercase">Collection Studio</h4>
            <div className="text-sm text-stone-400 space-y-2">
              <p className="flex items-start gap-2">
                <MapPin className="w-4 h-4 text-amber-500 mt-1 shrink-0" />
                <span>742 Patisserie Walk, Suite B<br />San Francisco, CA 94107</span>
              </p>
              <p className="text-xs text-stone-500 pt-2">
                Pickups available Wednesday - Sunday in designated 2-hour collection slots.
              </p>
            </div>
          </div>
        </div>

        <div className="pt-8 flex flex-col sm:flex-row items-center justify-between text-xs text-stone-500 gap-4">
          <p>© {new Date().getFullYear()} CakeCart Bakery Ltd. All rights reserved.</p>
          <p className="flex items-center gap-4">
            <span>Powered by Next.js & Neon PostgreSQL</span>
            <span>•</span>
            <span>Vercel Marketplace Verified</span>
          </p>
        </div>
      </div>
    </footer>
  );
}
