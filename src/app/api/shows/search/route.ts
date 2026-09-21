import { NextRequest, NextResponse } from "next/server";
import { searchTVmazeShows } from "@/lib/tvmaze";

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const query = searchParams.get("q");

  if (!query || query.trim().length === 0) {
    return NextResponse.json({ shows: [] });
  }

  try {
    const shows = await searchTVmazeShows(query);
    return NextResponse.json({ shows });
  } catch (err: any) {
    console.error("Search API Error:", err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
