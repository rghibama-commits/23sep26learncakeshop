"use client";

import React, { useEffect, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { formatPrice } from "@/lib/format";
import {
  Search,
  Filter,
  SlidersHorizontal,
  Clock,
  Sparkles,
  ChevronRight,
  RotateCcw,
} from "lucide-react";

interface ProductItem {
  id: string;
  name: string;
  slug: string;
  description: string;
  basePriceInCents: number;
  imageUrl: string;
  minLeadTimeHours: number;
  categories: { category: { id: string; name: string; slug: string } }[];
  dietaryTags: { dietaryTag: { id: string; name: string; slug: string } }[];
  options: { id: string; type: "SIZE" | "FLAVOUR"; name: string; priceDeltaInCents: number }[];
}

interface MetadataResponse {
  categories: { id: string; name: string; slug: string }[];
  dietaryTags: { id: string; name: string; slug: string }[];
  flavours: string[];
  sizes: string[];
  totalCount: number;
}

export default function MenuPage() {
  const [products, setProducts] = useState<ProductItem[]>([]);
  const [metadata, setMetadata] = useState<MetadataResponse | null>(null);
  const [loading, setLoading] = useState(true);

  // Filters state
  const [category, setCategory] = useState("all");
  const [dietary, setDietary] = useState("all");
  const [flavour, setFlavour] = useState("all");
  const [size, setSize] = useState("all");
  const [maxPrice, setMaxPrice] = useState<number>(8000); // $80.00
  const [search, setSearch] = useState("");

  const fetchCakes = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (category !== "all") params.set("category", category);
      if (dietary !== "all") params.set("dietary", dietary);
      if (flavour !== "all") params.set("flavour", flavour);
      if (size !== "all") params.set("size", size);
      if (maxPrice) params.set("maxPrice", maxPrice.toString());
      if (search) params.set("search", search);

      const res = await fetch(`/api/cakes?${params.toString()}`);
      const data = await res.json();
      if (res.ok) {
        setProducts(data.products || []);
        if (data.metadata) setMetadata(data.metadata);
      }
    } catch (e) {
      console.error("Error fetching cakes", e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCakes();
  }, [category, dietary, flavour, size, maxPrice, search]);

  const resetFilters = () => {
    setCategory("all");
    setDietary("all");
    setFlavour("all");
    setSize("all");
    setMaxPrice(8000);
    setSearch("");
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
      {/* Page Header */}
      <div className="text-center max-w-2xl mx-auto mb-12 space-y-3">
        <span className="px-3.5 py-1.5 rounded-full bg-amber-100/80 text-amber-900 text-xs font-semibold uppercase tracking-wider">
          Daily Small-Batch Baking
        </span>
        <h1 className="font-serif text-4xl sm:text-5xl font-bold text-stone-900 tracking-tight">
          Handcrafted Artisan Cakes
        </h1>
        <p className="text-stone-600 text-sm sm:text-base leading-relaxed">
          Every creation is baked fresh to order in limited daily numbers. Browse our seasonal collection, filter by allergen requirements, and secure your pickup slot.
        </p>
      </div>

      {/* Filter & Search Bar */}
      <div className="bg-white rounded-3xl border border-stone-200 p-6 shadow-sm mb-10 space-y-6">
        <div className="flex flex-col md:flex-row gap-4 justify-between items-center">
          {/* Search Input */}
          <div className="relative w-full md:w-96">
            <Search className="w-4 h-4 text-stone-400 absolute left-4 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Search by cake name or ingredients..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-11 pr-4 py-2.5 rounded-xl border border-stone-200 text-sm focus:outline-none focus:ring-2 focus:ring-amber-700/20 focus:border-amber-700"
            />
          </div>

          {/* Reset Filters button */}
          <button
            onClick={resetFilters}
            className="text-xs font-semibold text-stone-500 hover:text-amber-800 flex items-center gap-1.5 px-3 py-2 rounded-lg hover:bg-stone-100 transition-colors"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            Reset Filters
          </button>
        </div>

        {/* Category Pills */}
        <div className="flex items-center gap-2 overflow-x-auto pb-2 scrollbar-none">
          <button
            onClick={() => setCategory("all")}
            className={`px-4 py-2 rounded-xl text-xs font-semibold whitespace-nowrap transition-all ${
              category === "all"
                ? "bg-amber-800 text-white shadow-sm"
                : "bg-stone-100 text-stone-700 hover:bg-stone-200"
            }`}
          >
            All Categories
          </button>
          {metadata?.categories.map((cat) => (
            <button
              key={cat.id}
              onClick={() => setCategory(cat.slug)}
              className={`px-4 py-2 rounded-xl text-xs font-semibold whitespace-nowrap transition-all ${
                category === cat.slug
                  ? "bg-amber-800 text-white shadow-sm"
                  : "bg-stone-100 text-stone-700 hover:bg-stone-200"
              }`}
            >
              {cat.name}
            </button>
          ))}
        </div>

        {/* Detailed Filters (Dietary, Flavour, Size, Price) */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 pt-4 border-t border-stone-100 text-xs">
          {/* Dietary Tag Filter */}
          <div>
            <label className="block font-semibold text-stone-700 mb-1.5">Dietary Tag</label>
            <select
              value={dietary}
              onChange={(e) => setDietary(e.target.value)}
              className="w-full px-3 py-2 rounded-xl border border-stone-200 bg-stone-50 focus:outline-none focus:ring-1 focus:ring-amber-700 text-stone-800"
            >
              <option value="all">All Dietary Preferences</option>
              {metadata?.dietaryTags.map((dt) => (
                <option key={dt.id} value={dt.slug}>
                  {dt.name}
                </option>
              ))}
            </select>
          </div>

          {/* Flavour Filter */}
          <div>
            <label className="block font-semibold text-stone-700 mb-1.5">Flavour Infusion</label>
            <select
              value={flavour}
              onChange={(e) => setFlavour(e.target.value)}
              className="w-full px-3 py-2 rounded-xl border border-stone-200 bg-stone-50 focus:outline-none focus:ring-1 focus:ring-amber-700 text-stone-800"
            >
              <option value="all">All Flavours</option>
              {metadata?.flavours.map((flv) => (
                <option key={flv} value={flv}>
                  {flv}
                </option>
              ))}
            </select>
          </div>

          {/* Size Filter */}
          <div>
            <label className="block font-semibold text-stone-700 mb-1.5">Portion Size</label>
            <select
              value={size}
              onChange={(e) => setSize(e.target.value)}
              className="w-full px-3 py-2 rounded-xl border border-stone-200 bg-stone-50 focus:outline-none focus:ring-1 focus:ring-amber-700 text-stone-800"
            >
              <option value="all">All Sizes</option>
              {metadata?.sizes.map((sz) => (
                <option key={sz} value={sz}>
                  {sz}
                </option>
              ))}
            </select>
          </div>

          {/* Price Range Slider */}
          <div>
            <div className="flex justify-between items-center mb-1.5">
              <label className="font-semibold text-stone-700">Max Base Price</label>
              <span className="font-bold text-amber-800">{formatPrice(maxPrice)}</span>
            </div>
            <input
              type="range"
              min={4000}
              max={8000}
              step={200}
              value={maxPrice}
              onChange={(e) => setMaxPrice(Number(e.target.value))}
              className="w-full accent-amber-700 cursor-pointer"
            />
          </div>
        </div>
      </div>

      {/* Product Grid */}
      {loading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-8">
          {[1, 2, 3, 4, 5, 6].map((n) => (
            <div
              key={n}
              className="bg-white rounded-3xl border border-stone-200 h-96 animate-pulse p-4 space-y-4"
            >
              <div className="h-56 bg-stone-200 rounded-2xl" />
              <div className="h-5 bg-stone-200 rounded w-3/4" />
              <div className="h-4 bg-stone-200 rounded w-1/2" />
            </div>
          ))}
        </div>
      ) : products.length === 0 ? (
        <div className="text-center py-20 bg-white rounded-3xl border border-stone-200 p-8 space-y-4">
          <Sparkles className="w-10 h-10 text-amber-700 mx-auto" />
          <h3 className="font-serif text-xl font-bold text-stone-900">No Cakes Match Your Filters</h3>
          <p className="text-stone-500 text-sm max-w-md mx-auto">
            Try resetting your dietary tags, flavour, or price range to explore our full artisan menu.
          </p>
          <button
            onClick={resetFilters}
            className="px-5 py-2.5 bg-amber-700 text-white rounded-xl text-xs font-semibold hover:bg-amber-800 transition-colors"
          >
            Clear All Filters
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-8">
          {products.map((cake) => (
            <div
              key={cake.id}
              className="bakery-card overflow-hidden flex flex-col group"
            >
              {/* Image Preview with Badges */}
              <div className="relative aspect-[4/3] overflow-hidden bg-stone-100">
                <Image
                  src={cake.imageUrl}
                  alt={cake.name}
                  fill
                  className="object-cover group-hover:scale-105 transition-transform duration-500"
                  sizes="(max-width: 768px) 100vw, 400px"
                />
                {/* Lead time badge */}
                <div className="absolute top-3 left-3 bg-white/95 backdrop-blur-sm px-2.5 py-1 rounded-full text-[11px] font-semibold text-stone-800 shadow-sm flex items-center gap-1">
                  <Clock className="w-3 h-3 text-amber-700" />
                  {cake.minLeadTimeHours}h Notice
                </div>

                {/* Dietary Tag Badges */}
                <div className="absolute bottom-3 left-3 flex flex-wrap gap-1.5">
                  {cake.dietaryTags.slice(0, 2).map((dt) => (
                    <span
                      key={dt.dietaryTag.id}
                      className="px-2 py-0.5 rounded-full bg-emerald-950/80 backdrop-blur-sm text-emerald-200 text-[10px] font-medium"
                    >
                      {dt.dietaryTag.name}
                    </span>
                  ))}
                </div>
              </div>

              {/* Details & CTA */}
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
                  <div>
                    <span className="text-[10px] uppercase font-semibold text-stone-400 block">From</span>
                    <span className="font-serif text-2xl font-bold text-amber-800">
                      {formatPrice(cake.basePriceInCents)}
                    </span>
                  </div>

                  <Link
                    href={`/customize/${cake.slug}`}
                    className="px-4 py-2.5 rounded-xl bg-amber-700 hover:bg-amber-800 text-white font-semibold text-xs transition-all shadow-sm flex items-center gap-1.5 group-hover:shadow-md"
                  >
                    <span>Customise</span>
                    <ChevronRight className="w-3.5 h-3.5" />
                  </Link>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
