import { NextRequest, NextResponse } from "next/server";
import { getDb, schema } from "@/db";
import { eq } from "drizzle-orm";

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ slug: string }> }
) {
  try {
    const { slug } = await params;
    const db = await getDb();

    const product = await db.query.products.findFirst({
      where: eq(schema.products.slug, slug),
      with: {
        categories: {
          with: { category: true },
        },
        dietaryTags: {
          with: { dietaryTag: true },
        },
        options: true,
      },
    });

    if (!product) {
      return NextResponse.json({ error: "Cake not found." }, { status: 404 });
    }

    // Segregate options into sizes and flavours
    const sizes = product.options.filter((o) => o.type === "SIZE");
    const flavours = product.options.filter((o) => o.type === "FLAVOUR");

    return NextResponse.json({
      success: true,
      product: {
        ...product,
        sizes,
        flavours,
      },
    });
  } catch (error) {
    console.error("Error fetching cake details:", error);
    return NextResponse.json({ error: "Failed to load cake details." }, { status: 500 });
  }
}
