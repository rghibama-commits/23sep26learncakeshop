"use client";

import React, { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Image from "next/image";
import Link from "next/link";
import { useCart } from "@/context/CartContext";
import { formatPrice } from "@/lib/format";
import {
  ArrowLeft,
  Sparkles,
  Check,
  Upload,
  MessageSquare,
  Clock,
  ShieldCheck,
  Plus,
  Minus,
} from "lucide-react";

interface ProductOption {
  id: string;
  type: "SIZE" | "FLAVOUR";
  name: string;
  priceDeltaInCents: number;
}

interface ProductDetails {
  id: string;
  name: string;
  slug: string;
  description: string;
  basePriceInCents: number;
  imageUrl: string;
  minLeadTimeHours: number;
  sizes: ProductOption[];
  flavours: ProductOption[];
  dietaryTags: { dietaryTag: { id: string; name: string; slug: string } }[];
}

export default function CustomiseCakePage() {
  const params = useParams();
  const router = useRouter();
  const slug = params?.slug as string;

  const { addItem } = useCart();

  const [cake, setCake] = useState<ProductDetails | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Form State
  const [selectedSize, setSelectedSize] = useState<ProductOption | null>(null);
  const [selectedFlavour, setSelectedFlavour] = useState<ProductOption | null>(null);
  const [cakeMessage, setCakeMessage] = useState("");
  const [quantity, setQuantity] = useState(1);
  const [uploadingImage, setUploadingImage] = useState(false);
  const [referenceImageUrl, setReferenceImageUrl] = useState<string>("");

  useEffect(() => {
    async function loadCake() {
      try {
        const res = await fetch(`/api/cakes/${slug}`);
        const data = await res.json();
        if (res.ok && data.product) {
          setCake(data.product);
          if (data.product.sizes?.length > 0) {
            setSelectedSize(data.product.sizes[0]);
          }
          if (data.product.flavours?.length > 0) {
            setSelectedFlavour(data.product.flavours[0]);
          }
        } else {
          setError(data.error || "Cake not found");
        }
      } catch {
        setError("Network error loading cake details");
      } finally {
        setLoading(false);
      }
    }
    if (slug) loadCake();
  }, [slug]);

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploadingImage(true);
    const formData = new FormData();
    formData.append("file", file);

    try {
      const res = await fetch("/api/upload", {
        method: "POST",
        body: formData,
      });
      const data = await res.json();
      if (res.ok && data.url) {
        setReferenceImageUrl(data.url);
      } else {
        alert(data.error || "Upload failed");
      }
    } catch {
      alert("Error uploading reference image.");
    } finally {
      setUploadingImage(false);
    }
  };

  // Pricing calculations
  const basePrice = cake?.basePriceInCents || 0;
  const sizeDelta = selectedSize?.priceDeltaInCents || 0;
  const flavourDelta = selectedFlavour?.priceDeltaInCents || 0;
  const messageFee = cakeMessage.trim().length > 0 ? 250 : 0;
  const unitPrice = basePrice + sizeDelta + flavourDelta;
  const grandTotal = (unitPrice + messageFee) * quantity;

  const handleAddToCart = () => {
    if (!cake) return;

    addItem({
      productId: cake.id,
      name: cake.name,
      slug: cake.slug,
      imageUrl: cake.imageUrl,
      basePriceInCents: cake.basePriceInCents,
      quantity,
      sizeOption: selectedSize ? {
        id: selectedSize.id,
        name: selectedSize.name,
        priceDeltaInCents: selectedSize.priceDeltaInCents,
      } : undefined,
      flavourOption: selectedFlavour ? {
        id: selectedFlavour.id,
        name: selectedFlavour.name,
        priceDeltaInCents: selectedFlavour.priceDeltaInCents,
      } : undefined,
      cakeMessage: cakeMessage.trim() || undefined,
      referenceImageUrl: referenceImageUrl || undefined,
    });

    router.push("/cart");
  };

  if (loading) {
    return (
      <div className="max-w-4xl mx-auto px-4 py-20 text-center">
        <div className="w-10 h-10 mx-auto border-3 border-amber-700 border-t-transparent rounded-full animate-spin mb-4" />
        <p className="text-stone-600 font-medium">Preparing customization studio...</p>
      </div>
    );
  }

  if (error || !cake) {
    return (
      <div className="max-w-2xl mx-auto px-4 py-20 text-center">
        <h2 className="text-2xl font-serif font-bold text-stone-900 mb-2">Cake Not Found</h2>
        <p className="text-stone-600 mb-6">{error || "The requested cake does not exist in our catalog."}</p>
        <Link href="/menu" className="px-6 py-2.5 bg-amber-700 text-white rounded-xl font-medium">
          Return to Menu
        </Link>
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
      {/* Back button */}
      <Link
        href="/menu"
        className="inline-flex items-center gap-2 text-stone-600 hover:text-amber-800 text-sm font-medium mb-8 transition-colors"
      >
        <ArrowLeft className="w-4 h-4" />
        Back to Menu
      </Link>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-12">
        {/* Left Column: Cake Preview */}
        <div className="lg:col-span-5 space-y-6">
          <div className="relative aspect-square rounded-3xl overflow-hidden shadow-lg border border-stone-200">
            <Image
              src={cake.imageUrl}
              alt={cake.name}
              fill
              className="object-cover"
              sizes="(max-width: 768px) 100vw, 500px"
              priority
            />
          </div>

          <div className="bg-white p-6 rounded-2xl border border-stone-200 space-y-4">
            <h1 className="font-serif text-2xl font-bold text-stone-900">{cake.name}</h1>
            <p className="text-stone-600 text-sm leading-relaxed">{cake.description}</p>

            <div className="flex flex-wrap gap-2 pt-2">
              {cake.dietaryTags.map((dt) => (
                <span
                  key={dt.dietaryTag.id}
                  className="px-2.5 py-1 rounded-full bg-emerald-50 text-emerald-800 border border-emerald-200 text-xs font-medium"
                >
                  ✓ {dt.dietaryTag.name}
                </span>
              ))}
              <span className="px-2.5 py-1 rounded-full bg-amber-50 text-amber-900 border border-amber-200 text-xs font-medium flex items-center gap-1">
                <Clock className="w-3 h-3 text-amber-700" />
                {cake.minLeadTimeHours}h Minimum Notice
              </span>
            </div>
          </div>
        </div>

        {/* Right Column: Customization Controls */}
        <div className="lg:col-span-7 space-y-8">
          <div className="bg-white p-8 rounded-3xl border border-stone-200 shadow-sm space-y-8">
            <div className="border-b border-stone-100 pb-4">
              <h2 className="font-serif text-xl font-bold text-stone-900 flex items-center gap-2">
                <Sparkles className="w-5 h-5 text-amber-700" />
                Customise Your Cake
              </h2>
              <p className="text-xs text-stone-500 mt-1">
                Choose portions, artisan flavour infusion, and custom piped message.
              </p>
            </div>

            {/* 1. Size Selection */}
            <div>
              <label className="block text-sm font-bold text-stone-800 mb-3">
                1. Select Size & Portions
              </label>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {cake.sizes.map((size) => {
                  const isSelected = selectedSize?.id === size.id;
                  return (
                    <button
                      type="button"
                      key={size.id}
                      onClick={() => setSelectedSize(size)}
                      className={`p-3.5 rounded-xl border text-left transition-all flex items-center justify-between ${
                        isSelected
                          ? "bg-amber-50/90 border-amber-600 ring-2 ring-amber-600/20"
                          : "border-stone-200 hover:border-amber-300"
                      }`}
                    >
                      <div>
                        <div className="font-semibold text-stone-900 text-sm">{size.name}</div>
                        <div className="text-xs text-amber-800 font-medium">
                          {size.priceDeltaInCents === 0
                            ? "Standard Included"
                            : `+${formatPrice(size.priceDeltaInCents)}`}
                        </div>
                      </div>
                      {isSelected && (
                        <div className="w-5 h-5 rounded-full bg-amber-700 text-white flex items-center justify-center">
                          <Check className="w-3 h-3" />
                        </div>
                      )}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* 2. Flavour Selection */}
            <div>
              <label className="block text-sm font-bold text-stone-800 mb-3">
                2. Artisan Flavour Infusion
              </label>
              <div className="space-y-2">
                {cake.flavours.map((flv) => {
                  const isSelected = selectedFlavour?.id === flv.id;
                  return (
                    <button
                      type="button"
                      key={flv.id}
                      onClick={() => setSelectedFlavour(flv)}
                      className={`w-full p-3.5 rounded-xl border text-left transition-all flex items-center justify-between ${
                        isSelected
                          ? "bg-amber-50/90 border-amber-600 ring-2 ring-amber-600/20"
                          : "border-stone-200 hover:border-amber-300"
                      }`}
                    >
                      <div>
                        <div className="font-semibold text-stone-900 text-sm">{flv.name}</div>
                        {flv.priceDeltaInCents > 0 && (
                          <div className="text-xs text-amber-800 font-medium">
                            +{formatPrice(flv.priceDeltaInCents)}
                          </div>
                        )}
                      </div>
                      {isSelected && (
                        <div className="w-5 h-5 rounded-full bg-amber-700 text-white flex items-center justify-center">
                          <Check className="w-3 h-3" />
                        </div>
                      )}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* 3. Custom Message (40-char limit strictly enforced) */}
            <div>
              <div className="flex items-center justify-between mb-2">
                <label className="block text-sm font-bold text-stone-800 flex items-center gap-1.5">
                  <MessageSquare className="w-4 h-4 text-amber-700" />
                  3. Piped Cake Plaque Message
                  <span className="text-xs font-normal text-stone-500">(+$2.50 fee)</span>
                </label>
                <span
                  className={`text-xs font-semibold ${
                    cakeMessage.length >= 40 ? "text-red-600" : "text-stone-500"
                  }`}
                >
                  {cakeMessage.length} / 40 chars
                </span>
              </div>
              <input
                type="text"
                maxLength={40}
                value={cakeMessage}
                onChange={(e) => setCakeMessage(e.target.value)}
                placeholder="e.g. Happy 30th Birthday Sophia!"
                className="w-full px-4 py-3 rounded-xl border border-stone-300 focus:outline-none focus:ring-2 focus:ring-amber-600 focus:border-amber-600 text-sm"
              />
              <p className="text-[11px] text-stone-500 mt-1.5">
                Our pastry chef hand-pipes on chocolate plaque. Max 40 characters enforced.
              </p>
            </div>

            {/* 4. Customer Reference Image Upload */}
            <div>
              <label className="block text-sm font-bold text-stone-800 mb-2 flex items-center gap-1.5">
                <Upload className="w-4 h-4 text-amber-700" />
                4. Reference Image or Theme Idea (Optional)
              </label>
              <div className="flex items-center gap-4">
                <label className="cursor-pointer px-4 py-2.5 rounded-xl border border-dashed border-stone-300 hover:border-amber-600 hover:bg-amber-50/40 text-stone-700 text-xs font-semibold flex items-center gap-2 transition-all">
                  <Upload className="w-4 h-4 text-stone-500" />
                  <span>{uploadingImage ? "Uploading..." : "Upload Photo (Vercel Blob)"}</span>
                  <input
                    type="file"
                    accept="image/*"
                    onChange={handleImageUpload}
                    disabled={uploadingImage}
                    className="hidden"
                  />
                </label>
                {referenceImageUrl && (
                  <span className="text-xs text-emerald-700 font-medium flex items-center gap-1">
                    <Check className="w-4 h-4 text-emerald-600" />
                    Photo attached
                  </span>
                )}
              </div>
            </div>

            {/* Quantity Selector */}
            <div className="flex items-center justify-between pt-4 border-t border-stone-100">
              <span className="text-sm font-bold text-stone-800">Quantity</span>
              <div className="flex items-center gap-3">
                <button
                  type="button"
                  onClick={() => setQuantity(Math.max(1, quantity - 1))}
                  className="w-8 h-8 rounded-lg border border-stone-300 flex items-center justify-center hover:bg-stone-100 text-stone-700"
                >
                  <Minus className="w-3.5 h-3.5" />
                </button>
                <span className="font-bold text-base w-6 text-center">{quantity}</span>
                <button
                  type="button"
                  onClick={() => setQuantity(quantity + 1)}
                  className="w-8 h-8 rounded-lg border border-stone-300 flex items-center justify-center hover:bg-stone-100 text-stone-700"
                >
                  <Plus className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>

            {/* Price Breakdown Preview & Submit */}
            <div className="p-5 rounded-2xl bg-[#FAF6EE] border border-amber-200/80 space-y-3">
              <div className="flex justify-between text-xs text-stone-600">
                <span>Base Cake:</span>
                <span>{formatPrice(basePrice * quantity)}</span>
              </div>
              {sizeDelta > 0 && (
                <div className="flex justify-between text-xs text-stone-600">
                  <span>Size Upgrade ({selectedSize?.name}):</span>
                  <span>+{formatPrice(sizeDelta * quantity)}</span>
                </div>
              )}
              {flavourDelta > 0 && (
                <div className="flex justify-between text-xs text-stone-600">
                  <span>Flavour Infusion ({selectedFlavour?.name}):</span>
                  <span>+{formatPrice(flavourDelta * quantity)}</span>
                </div>
              )}
              {messageFee > 0 && (
                <div className="flex justify-between text-xs text-amber-900 font-medium">
                  <span>Custom Plaque Fee:</span>
                  <span>+{formatPrice(messageFee * quantity)}</span>
                </div>
              )}

              <div className="flex justify-between items-baseline pt-2 border-t border-amber-200/60 font-bold text-stone-900 text-lg">
                <span>Total:</span>
                <span className="text-amber-800 text-2xl font-serif">
                  {formatPrice(grandTotal)}
                </span>
              </div>

              <button
                type="button"
                onClick={handleAddToCart}
                className="w-full mt-4 py-3.5 px-6 rounded-xl bg-amber-700 hover:bg-amber-800 text-white font-semibold text-base shadow-md hover:shadow-lg transition-all flex items-center justify-center gap-2"
              >
                <span>Add to Cart & Select Pickup Slot</span>
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
