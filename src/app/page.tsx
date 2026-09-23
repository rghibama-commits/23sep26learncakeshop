"use client";

import Link from "next/link";
import Image from "next/image";
import { useEffect, useState } from "react";
import { formatPrice } from "@/lib/format";
import {
  Sparkles,
  Clock,
  ShieldCheck,
  Calendar,
  ChevronRight,
  Heart,
  Award,
  Flame,
} from "lucide-react";

interface FeaturedCake {
  id: string;
  name: string;
  slug: string;
  description: string;
  basePriceInCents: number;
  imageUrl: string;
  minLeadTimeHours: number;
}

export default function HomePage() {
  const [featured, setFeatured] = useState<FeaturedCake[]>([]);

  useEffect(() => {
    async function loadFeatured() {
      try {
        const res = await fetch("/api/cakes");
        const data = await res.json();
        if (res.ok && data.products) {
          setFeatured(data.products.slice(0, 3));
        }
      } catch (err) {
        console.error("Failed to load featured cakes", err);
      }
    }
    loadFeatured();
  }, []);

  return (
    <div className="space-y-24 pb-16">
      {/* 1. Hero Section */}
      <section className="relative overflow-hidden pt-12 pb-20 lg:pt-20 lg:pb-32">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 items-center">
            {/* Left Copy */}
            <div className="lg:col-span-7 space-y-6 text-center lg:text-left">
              <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-amber-100/80 border border-amber-200 text-amber-900 text-xs font-semibold uppercase tracking-wider">
                <Sparkles className="w-3.5 h-3.5 text-amber-700" />
                <span>Small-Batch Artisanal Patisserie</span>
              </div>

              <h1 className="font-serif text-5xl sm:text-6xl lg:text-7xl font-bold tracking-tight text-stone-900 leading-[1.08]">
                Bespoke Cakes, Baked with{" "}
                <span className="italic text-amber-800 underline decoration-amber-300 decoration-wavy decoration-2">
                  Strict Intention.
                </span>
              </h1>

              <p className="text-stone-600 text-base sm:text-lg max-w-2xl leading-relaxed">
                We believe exceptional cakes cannot be rushed. We enforce strict daily capacity limits and dedicated 2-hour collection slots to guarantee every single cake is proofed, slow-baked, and hand-piped at peak perfection.
              </p>

              {/* Action Buttons */}
              <div className="flex flex-col sm:flex-row items-center gap-4 pt-4 justify-center lg:justify-start">
                <Link
                  href="/menu"
                  className="w-full sm:w-auto px-8 py-4 rounded-2xl bg-amber-700 hover:bg-amber-800 text-white font-semibold text-base shadow-md hover:shadow-lg transition-all flex items-center justify-center gap-2 group"
                >
                  <span>Explore Menu & Book Slot</span>
                  <ChevronRight className="w-4 h-4 transition-transform group-hover:translate-x-1" />
                </Link>
                <Link
                  href="/orders"
                  className="w-full sm:w-auto px-7 py-4 rounded-2xl border border-stone-300 hover:border-amber-700 bg-white/80 hover:bg-amber-50/50 text-stone-700 font-semibold text-base transition-all text-center"
                >
                  Track Existing Order
                </Link>
              </div>

              {/* Social Proof Stats */}
              <div className="pt-8 border-t border-stone-200/80 grid grid-cols-3 gap-6 text-center lg:text-left">
                <div>
                  <div className="font-serif text-2xl sm:text-3xl font-bold text-amber-900">12</div>
                  <div className="text-xs text-stone-500 font-medium">Max Cakes / Day</div>
                </div>
                <div>
                  <div className="font-serif text-2xl sm:text-3xl font-bold text-amber-900">48h</div>
                  <div className="text-xs text-stone-500 font-medium">Notice Required</div>
                </div>
                <div>
                  <div className="font-serif text-2xl sm:text-3xl font-bold text-amber-900">100%</div>
                  <div className="text-xs text-stone-500 font-medium">Scratch Baked</div>
                </div>
              </div>
            </div>

            {/* Right Hero Image Card */}
            <div className="lg:col-span-5 relative">
              <div className="relative mx-auto max-w-md lg:max-w-none aspect-[4/5] rounded-3xl overflow-hidden shadow-2xl border-4 border-white">
                <Image
                  src="https://images.unsplash.com/photo-1535141192574-5d4897c13136?auto=format&fit=crop&w=1000&q=85"
                  alt="Wild Berry Champagne Chiffon Cake"
                  fill
                  className="object-cover"
                  priority
                />
                <div className="absolute inset-0 bg-gradient-to-t from-stone-950/70 via-transparent to-transparent" />

                {/* Floating Highlight Card */}
                <div className="absolute bottom-6 left-6 right-6 p-4 rounded-2xl bg-white/95 backdrop-blur-md border border-stone-100 shadow-xl space-y-2">
                  <div className="flex justify-between items-center">
                    <span className="text-[11px] font-bold uppercase tracking-wider text-amber-800">
                      Signature Celebration
                    </span>
                    <span className="text-xs font-bold text-emerald-800 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200">
                      48h Notice
                    </span>
                  </div>
                  <div className="font-serif text-lg font-bold text-stone-900">
                    Wild Berry Champagne Chiffon
                  </div>
                  <div className="flex justify-between items-center pt-1 border-t border-stone-100">
                    <span className="text-xs text-stone-500">From $58.00</span>
                    <Link
                      href="/customize/wild-berry-champagne-chiffon"
                      className="text-xs font-semibold text-amber-800 hover:text-amber-900 flex items-center gap-1"
                    >
                      Customise <ChevronRight className="w-3.5 h-3.5" />
                    </Link>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* 2. Core Bakery Guarantees */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          <div className="bg-white rounded-3xl border border-stone-200 p-8 shadow-sm space-y-4 hover:border-amber-300 transition-colors">
            <div className="w-12 h-12 rounded-2xl bg-amber-100 text-amber-800 flex items-center justify-center">
              <ShieldCheck className="w-6 h-6" />
            </div>
            <h3 className="font-serif text-xl font-bold text-stone-900">
              Guaranteed Daily Capacity
            </h3>
            <p className="text-stone-600 text-sm leading-relaxed">
              We never over-book or rush oven time. Our booking engine locks slots in real-time with an atomic 10-minute hold window so you never lose your spot.
            </p>
          </div>

          <div className="bg-white rounded-3xl border border-stone-200 p-8 shadow-sm space-y-4 hover:border-amber-300 transition-colors">
            <div className="w-12 h-12 rounded-2xl bg-amber-100 text-amber-800 flex items-center justify-center">
              <Calendar className="w-6 h-6" />
            </div>
            <h3 className="font-serif text-xl font-bold text-stone-900">
              Dedicated 2-Hour Pickup Slots
            </h3>
            <p className="text-stone-600 text-sm leading-relaxed">
              Choose an exact time window for collection. Your cake is boxed and kept at the ideal temperature until your unique pickup QR code is scanned.
            </p>
          </div>

          <div className="bg-white rounded-3xl border border-stone-200 p-8 shadow-sm space-y-4 hover:border-amber-300 transition-colors">
            <div className="w-12 h-12 rounded-2xl bg-amber-100 text-amber-800 flex items-center justify-center">
              <Sparkles className="w-6 h-6" />
            </div>
            <h3 className="font-serif text-xl font-bold text-stone-900">
              Hand-Piped Custom Plaques
            </h3>
            <p className="text-stone-600 text-sm leading-relaxed">
              Personalize with up to 40 characters piped on Belgian chocolate, select portion sizes, and upload theme reference photos directly to our studio.
            </p>
          </div>
        </div>
      </section>

      {/* 3. Featured Creations Preview */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex flex-col sm:flex-row justify-between items-end mb-10 gap-4">
          <div>
            <span className="text-xs font-semibold uppercase tracking-wider text-amber-800">
              Artisan Favorites
            </span>
            <h2 className="font-serif text-3xl sm:text-4xl font-bold text-stone-900 mt-1">
              Popular Celebration Cakes
            </h2>
          </div>
          <Link
            href="/menu"
            className="text-sm font-semibold text-amber-800 hover:text-amber-900 flex items-center gap-1"
          >
            <span>View Full Menu</span>
            <ChevronRight className="w-4 h-4" />
          </Link>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          {featured.map((cake) => (
            <div key={cake.id} className="bakery-card overflow-hidden flex flex-col group">
              <div className="relative aspect-[4/3] bg-stone-100 overflow-hidden">
                <Image
                  src={cake.imageUrl}
                  alt={cake.name}
                  fill
                  className="object-cover group-hover:scale-105 transition-transform duration-500"
                  sizes="(max-width: 768px) 100vw, 400px"
                />
                <div className="absolute top-3 left-3 bg-white/95 px-2.5 py-1 rounded-full text-[11px] font-semibold text-stone-800 shadow-sm flex items-center gap-1">
                  <Clock className="w-3 h-3 text-amber-700" />
                  48h Notice
                </div>
              </div>
              <div className="p-6 flex-1 flex flex-col justify-between space-y-4">
                <div>
                  <h3 className="font-serif text-xl font-bold text-stone-900 group-hover:text-amber-800 transition-colors">
                    {cake.name}
                  </h3>
                  <p className="text-xs text-stone-600 line-clamp-2 mt-1 leading-relaxed">
                    {cake.description}
                  </p>
                </div>
                <div className="pt-4 border-t border-stone-100 flex items-center justify-between">
                  <span className="font-serif text-2xl font-bold text-amber-800">
                    {formatPrice(cake.basePriceInCents)}
                  </span>
                  <Link
                    href={`/customize/${cake.slug}`}
                    className="px-4 py-2 rounded-xl bg-amber-700 hover:bg-amber-800 text-white font-semibold text-xs transition-all shadow-sm"
                  >
                    Customise
                  </Link>
                </div>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* 4. Chef's Story / Baker Studio */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="bg-[#FAF3EA] border border-amber-200/80 rounded-3xl p-8 sm:p-12 lg:p-16">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-10 items-center">
            <div className="lg:col-span-7 space-y-6">
              <span className="px-3 py-1 rounded-full bg-amber-200/60 text-amber-900 text-xs font-semibold uppercase tracking-wider">
                From The Head Pastry Chef
              </span>
              <h2 className="font-serif text-3xl sm:text-4xl font-bold text-stone-900">
                “Every cake marks a milestone in someone’s life. We refuse to compromise with shortcuts.”
              </h2>
              <p className="text-stone-700 text-sm sm:text-base leading-relaxed">
                Trained in Lyon and Paris, Chef Aurelia Delacroix founded CakeCart to return bakery craft to small-batch integrity. By capping our ovens to a strict maximum of 12 artisan cakes per day, we spend hours perfecting every sponge crumb, hand-whipped fruit compote, and tempered chocolate plaque.
              </p>
              <div className="pt-2 flex items-center gap-4">
                <div className="w-12 h-12 rounded-full bg-amber-700 text-white font-serif font-bold text-lg flex items-center justify-center">
                  AD
                </div>
                <div>
                  <div className="font-bold text-stone-900 text-sm">Chef Aurelia Delacroix</div>
                  <div className="text-xs text-amber-800 font-medium">Head Pastry Chef & Founder</div>
                </div>
              </div>
            </div>

            <div className="lg:col-span-5 relative aspect-square rounded-2xl overflow-hidden shadow-lg border-2 border-white">
              <Image
                src="https://images.unsplash.com/photo-1578985545062-69928b1d9587?auto=format&fit=crop&w=800&q=80"
                alt="Chef preparing celebration cake"
                fill
                className="object-cover"
              />
            </div>
          </div>
        </div>
      </section>

      {/* 5. Bottom CTA Banner */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
        <div className="bg-stone-900 text-white rounded-3xl p-12 sm:p-16 shadow-xl relative overflow-hidden space-y-6">
          <div className="max-w-2xl mx-auto space-y-4">
            <h2 className="font-serif text-3xl sm:text-4xl font-bold">
              Ready to Reserve Your Celebration Cake?
            </h2>
            <p className="text-stone-400 text-sm sm:text-base">
              Slots fill up quickly due to our 12-cake daily capacity. Secure your date and collection window today.
            </p>
            <div className="pt-4">
              <Link
                href="/menu"
                className="inline-flex px-8 py-4 rounded-xl bg-amber-600 hover:bg-amber-500 text-white font-semibold text-base transition-all shadow-md"
              >
                Browse Menu & Reserve Slot
              </Link>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
