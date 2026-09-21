import { NextRequest, NextResponse } from "next/server";
import { optimizeSubscriptions } from "@/lib/optimizer";
import { Show } from "@/lib/types";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const shows: Show[] = body.shows || [];

    const result = optimizeSubscriptions(shows);
    return NextResponse.json({ result });
  } catch (err: any) {
    console.error("Optimization API Error:", err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
