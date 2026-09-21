import { NextRequest, NextResponse } from "next/server";
import { getShowEpisodes } from "@/lib/tvmaze";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const showId = parseInt(id, 10);

  if (isNaN(showId)) {
    return NextResponse.json({ error: "Invalid show ID" }, { status: 400 });
  }

  try {
    const episodes = await getShowEpisodes(showId);
    return NextResponse.json({ episodes });
  } catch (err: any) {
    console.error("Episode Schedule API Error:", err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
