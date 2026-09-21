import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";

export async function GET() {
  try {
    const user = await getCurrentUser();
    return NextResponse.json({ user });
  } catch (err: any) {
    console.error("Auth me error:", err);
    return NextResponse.json({ user: null });
  }
}
