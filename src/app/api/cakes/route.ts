import { NextRequest, NextResponse } from "next/server";
import { getDb, schema } from "@/db";
import { eq } from "drizzle-orm";

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const categorySlug = searchParams.get("category");
    const dietarySlug = searchParams.get("dietary");
    const flavour = searchParams.get("flavour");
    const size = searchParams.get("size");
    const maxPrice = searchParams.get("maxPrice");
    const search = searchParams.get("search")?.toLowerCase();

    const db = await getDb();

    // Fetch all active products with relations
    const allProducts = await db.query.products.findMany({
      where: eq(schema.products.isActive, true),
      with: {
        categories: {
          with: {
            category: true,
          },
        },
        dietaryTags: {
          with: {
            dietaryTag: true,
          },
        },
        options: true,
      },
    });

    // Fetch categories and dietary tags for filter metadata
    const categoriesList = await db.query.categories.findMany({
      orderBy: (c, { asc }) => [asc(c.displayOrder)],
    });

    const dietaryList = await db.query.dietaryTags.findMany();

    // Extract all unique flavour and size names
    const allFlavours = new Set<string>();
    const allSizes = new Set<string>();

    allProducts.forEach((p) => {
      p.options.forEach((opt) => {
        if (opt.type === "FLAVOUR") allFlavours.add(opt.name);
        if (opt.type === "SIZE") allSizes.add(opt.name);
      });
    });

    // Apply filtering in memory
    const filteredProducts = allProducts.filter((p) => {
      // Category filter
      if (categorySlug && categorySlug !== "all") {
        const matchesCategory = p.categories.some((c) => c.category.slug === categorySlug);
        if (!matchesCategory) return false;
      }

      // Dietary tag filter
      if (dietarySlug && dietarySlug !== "all") {
        const matchesDietary = p.dietaryTags.some((d) => d.dietaryTag.slug === dietarySlug);
        if (!matchesDietary) return false;
      }

      // Flavour filter
      if (flavour && flavour !== "all") {
        const matchesFlavour = p.options.some((opt) => opt.type === "FLAVOUR" && opt.name === flavour);
        if (!matchesFlavour) return false;
      }

      // Size filter
      if (size && size !== "all") {
        const matchesSize = p.options.some((opt) => opt.type === "SIZE" && opt.name === size);
        if (!matchesSize) return false;
      }

      // Max Price filter (in cents)
      if (maxPrice) {
        const maxPriceCents = parseInt(maxPrice, 10);
        if (!isNaN(maxPriceCents) && p.basePriceInCents > maxPriceCents) {
          return false;
        }
      }

      // Search term filter
      if (search) {
        const matchName = p.name.toLowerCase().includes(search);
        const matchDesc = p.description.toLowerCase().includes(search);
        if (!matchName && !matchDesc) return false;
      }

      return true;
    });

    return NextResponse.json({
      success: true,
      products: filteredProducts,
      metadata: {
        categories: categoriesList,
        dietaryTags: dietaryList,
        flavours: Array.from(allFlavours),
        sizes: Array.from(allSizes),
        totalCount: filteredProducts.length,
      },
    });
  } catch (error) {
    console.error("Error fetching cakes:", error);
    return NextResponse.json({ error: "Failed to load cakes." }, { status: 500 });
  }
}
