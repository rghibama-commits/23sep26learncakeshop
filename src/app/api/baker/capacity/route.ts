import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { getDb, schema } from "@/db";
import { gte, eq } from "drizzle-orm";

// GET all capacities
export async function GET() {
  try {
    const session = await getSession();
    if (!session || (session.role !== "BAKER" && session.role !== "ADMIN")) {
      return NextResponse.json({ error: "Forbidden. Baker access required." }, { status: 403 });
    }

    const db = await getDb();
    const todayStr = new Date().toISOString().split("T")[0];

    const capacities = await db.query.dailyCapacity.findMany({
      where: gte(schema.dailyCapacity.bakeryDate, todayStr),
      orderBy: (c, { asc }) => [asc(c.bakeryDate)],
    });

    return NextResponse.json({
      success: true,
      capacities,
    });
  } catch (error) {
    console.error("Baker capacity error:", error);
    return NextResponse.json({ error: "Failed to fetch capacities." }, { status: 500 });
  }
}

// POST/PUT update capacity for a date
export async function POST(req: NextRequest) {
  try {
    const session = await getSession();
    if (!session || (session.role !== "BAKER" && session.role !== "ADMIN")) {
      return NextResponse.json({ error: "Forbidden. Baker access required." }, { status: 403 });
    }

    const body = await req.json();
    const { bakeryDate, maxCakes, isClosed } = body;

    if (!bakeryDate) {
      return NextResponse.json({ error: "bakeryDate is required." }, { status: 400 });
    }

    const db = await getDb();

    // Check existing capacity row
    const [existing] = await db
      .select()
      .from(schema.dailyCapacity)
      .where(eq(schema.dailyCapacity.bakeryDate, bakeryDate));

    if (maxCakes !== undefined && existing && maxCakes < existing.reservedCakes) {
      return NextResponse.json(
        {
          error: `Cannot reduce maximum capacity to ${maxCakes}. There are already ${existing.reservedCakes} cakes reserved for ${bakeryDate}.`,
        },
        { status: 400 }
      );
    }

    const updateData: {
      maxCakes?: number;
      isClosed?: boolean;
      updatedAt: Date;
    } = {
      updatedAt: new Date(),
    };

    if (maxCakes !== undefined) updateData.maxCakes = maxCakes;
    if (isClosed !== undefined) updateData.isClosed = isClosed;

    const [updated] = await db
      .insert(schema.dailyCapacity)
      .values({
        bakeryDate,
        maxCakes: maxCakes ?? 12,
        reservedCakes: 0,
        isClosed: isClosed ?? false,
      })
      .onConflictDoUpdate({
        target: schema.dailyCapacity.bakeryDate,
        set: updateData,
      })
      .returning();

    // Audit log
    await db.insert(schema.auditLogs).values({
      entityType: "CAPACITY",
      entityId: updated.id,
      action: "CAPACITY_UPDATED",
      performedBy: session.userId,
      details: {
        bakeryDate,
        maxCakes: updated.maxCakes,
        isClosed: updated.isClosed,
      },
    });

    return NextResponse.json({
      success: true,
      capacity: updated,
      message: `Capacity for ${bakeryDate} updated successfully.`,
    });
  } catch (error) {
    console.error("Update capacity error:", error);
    return NextResponse.json({ error: "Failed to update capacity." }, { status: 500 });
  }
}
