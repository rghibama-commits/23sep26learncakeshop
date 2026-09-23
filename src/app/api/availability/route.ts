import { NextRequest, NextResponse } from "next/server";
import { getDb, schema } from "@/db";
import { gte, sql } from "drizzle-orm";

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const selectedDate = searchParams.get("date"); // YYYY-MM-DD (optional filter)

    const db = await getDb();
    const now = new Date();

    // 48-hour minimum lead time calculation
    // Orders cannot be picked up within 48 hours of now
    const minLeadTimeDate = new Date(now.getTime() + 48 * 60 * 60 * 1000);
    const minLeadTimeStr = minLeadTimeDate.toISOString().split("T")[0];

    const todayStr = now.toISOString().split("T")[0];

    // Fetch capacity for dates starting from today
    const capacityRecords = await db.query.dailyCapacity.findMany({
      where: gte(schema.dailyCapacity.bakeryDate, todayStr),
      orderBy: (c, { asc }) => [asc(c.bakeryDate)],
    });

    // Fetch pickup slots
    const slotsRecords = await db.query.pickupSlots.findMany({
      where: gte(schema.pickupSlots.bakeryDate, todayStr),
      orderBy: (s, { asc }) => [asc(s.bakeryDate), asc(s.startTime)],
    });

    // Map by date
    const availabilityByDate = capacityRecords.map((cap) => {
      const remainingCakes = Math.max(0, cap.maxCakes - cap.reservedCakes);
      const isLeadTimeEligible = cap.bakeryDate >= minLeadTimeStr;
      const isAvailable = isLeadTimeEligible && !cap.isClosed && remainingCakes > 0;

      // Filter slots for this date
      const slotsForDate = slotsRecords
        .filter((slot) => slot.bakeryDate === cap.bakeryDate)
        .map((slot) => ({
          id: slot.id,
          startTime: slot.startTime,
          endTime: slot.endTime,
          maxOrders: slot.maxOrders,
          reservedOrders: slot.reservedOrders,
          remainingOrders: Math.max(0, slot.maxOrders - slot.reservedOrders),
          isAvailable:
            isAvailable &&
            slot.isActive &&
            slot.reservedOrders < slot.maxOrders,
        }));

      return {
        date: cap.bakeryDate,
        maxCakes: cap.maxCakes,
        reservedCakes: cap.reservedCakes,
        remainingCakes,
        isClosed: cap.isClosed,
        isLeadTimeEligible,
        isAvailable,
        statusReason: !isLeadTimeEligible
          ? "Requires 48-hour minimum advance notice"
          : cap.isClosed
          ? "Bakery is closed on this date"
          : remainingCakes === 0
          ? "Fully booked (sold out)"
          : "Available",
        slots: slotsForDate,
      };
    });

    if (selectedDate) {
      const matched = availabilityByDate.find((a) => a.date === selectedDate);
      return NextResponse.json({
        success: true,
        dateAvailability: matched || null,
        minLeadTimeDate: minLeadTimeStr,
      });
    }

    return NextResponse.json({
      success: true,
      availability: availabilityByDate,
      minLeadTimeDate: minLeadTimeStr,
    });
  } catch (error) {
    console.error("Availability error:", error);
    return NextResponse.json({ error: "Failed to load bakery availability." }, { status: 500 });
  }
}
