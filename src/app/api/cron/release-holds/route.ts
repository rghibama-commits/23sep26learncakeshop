import { NextRequest, NextResponse } from "next/server";
import { releaseExpiredHolds } from "@/lib/transactions/holdRelease";

export async function GET(req: NextRequest) {
  return handleRelease(req);
}

export async function POST(req: NextRequest) {
  return handleRelease(req);
}

async function handleRelease(req: NextRequest) {
  try {
    const cronSecret = process.env.CRON_SECRET;
    
    // In production or when CRON_SECRET is configured, strictly enforce secret
    if (cronSecret) {
      const authHeader = req.headers.get("authorization");
      const bearerToken = authHeader?.startsWith("Bearer ") ? authHeader.substring(7) : null;
      const customHeader = req.headers.get("x-cron-secret");
      const querySecret = new URL(req.url).searchParams.get("secret");

      const providedToken = bearerToken || customHeader || querySecret;

      if (!providedToken || providedToken !== cronSecret) {
        return NextResponse.json({ error: "Unauthorized. Invalid CRON_SECRET." }, { status: 401 });
      }
    }

    const result = await releaseExpiredHolds();

    return NextResponse.json({
      success: true,
      message: `Successfully released ${result.releasedCount} expired hold(s).`,
      releasedCount: result.releasedCount,
      expiredOrderNumbers: result.expiredOrderNumbers,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error("Cron hold release error:", error);
    return NextResponse.json({ error: "Failed to release expired holds." }, { status: 500 });
  }
}
