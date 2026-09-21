import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { db } from "@/lib/db";
import { episodes, shows, subscriptionPlans, userWatchlist } from "@/lib/db/schema";
import { eq, and } from "drizzle-orm";
import { Show, ViewingPreference } from "@/lib/types";
import { optimizeSubscriptions, formatDate } from "@/lib/optimizer";

/**
 * GET /api/watchlist
 * Retrieve the authenticated user's saved shows and preferences
 */
export async function GET() {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const watchlistItems = await db
      .select({
        watchlistId: userWatchlist.id,
        preference: userWatchlist.preference,
        show: shows,
      })
      .from(userWatchlist)
      .innerJoin(shows, eq(userWatchlist.showId, shows.id))
      .where(eq(userWatchlist.userId, user.id));

    const resultShows: Show[] = [];
    for (const item of watchlistItems) {
      const showEpisodes = await db
        .select()
        .from(episodes)
        .where(eq(episodes.showId, item.show.id));

      resultShows.push({
        id: item.show.id,
        tvmazeId: item.show.tvmazeId,
        title: item.show.title,
        streamingService: item.show.streamingService,
        status: item.show.status,
        summary: item.show.summary || undefined,
        imageMedium: item.show.imageMedium || undefined,
        imageOriginal: item.show.imageOriginal || undefined,
        preference: item.preference as ViewingPreference,
        episodes: showEpisodes.map((e) => ({
          id: e.id,
          showId: e.showId,
          seasonNumber: e.seasonNumber,
          episodeNumber: e.episodeNumber,
          name: e.title || undefined,
          airDate: e.airDate,
          airTime: e.airTime || undefined,
          runtime: e.runtime || undefined,
        })),
      });
    }

    return NextResponse.json({ shows: resultShows });
  } catch (err: any) {
    console.error("Fetch Watchlist Error:", err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

/**
 * POST /api/watchlist
 * Sync user's watchlist to PostgreSQL and update future subscription windows
 */
export async function POST(request: NextRequest) {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const body = await request.json();
    const clientShows: Show[] = body.shows || [];

    // 1. Wipe current user watchlist entries and recreate from current state
    await db.delete(userWatchlist).where(eq(userWatchlist.userId, user.id));

    for (const clientShow of clientShows) {
      // Find or insert show record
      let showRecord = (
        await db.select().from(shows).where(eq(shows.tvmazeId, clientShow.tvmazeId))
      )[0];

      if (!showRecord) {
        const [newShow] = await db
          .insert(shows)
          .values({
            tvmazeId: clientShow.tvmazeId,
            title: clientShow.title,
            streamingService: clientShow.streamingService,
            status: clientShow.status,
            summary: clientShow.summary || null,
            imageMedium: clientShow.imageMedium || null,
            imageOriginal: clientShow.imageOriginal || null,
          })
          .returning();
        showRecord = newShow;
      }

      // If episodes provided, ensure they exist in DB
      if (clientShow.episodes && clientShow.episodes.length > 0) {
        const existingEps = await db
          .select()
          .from(episodes)
          .where(eq(episodes.showId, showRecord.id));

        if (existingEps.length === 0) {
          await db.insert(episodes).values(
            clientShow.episodes.map((ep) => ({
              showId: showRecord.id,
              tvmazeEpisodeId: typeof ep.id === "number" ? ep.id : null,
              seasonNumber: ep.seasonNumber,
              episodeNumber: ep.episodeNumber,
              title: ep.name || null,
              airDate: ep.airDate,
              airTime: ep.airTime || null,
              runtime: ep.runtime || null,
            }))
          );
        }
      }

      // Link to user's watchlist
      await db.insert(userWatchlist).values({
        userId: user.id,
        showId: showRecord.id,
        preference: clientShow.preference || "LIVE",
      });
    }

    // 2. Recalculate upcoming subscription windows for this user
    const today = formatDate(new Date());
    const optResult = optimizeSubscriptions(clientShows, { today });

    // Remove old unstarted UPCOMING windows
    await db
      .delete(subscriptionPlans)
      .where(and(eq(subscriptionPlans.userId, user.id), eq(subscriptionPlans.status, "UPCOMING")));

    // Insert new future windows
    for (const win of optResult.windows) {
      if (win.startDate >= today) {
        await db.insert(subscriptionPlans).values({
          userId: user.id,
          streamingService: win.streamingService,
          startDate: win.startDate,
          endDate: win.endDate,
          status: win.startDate <= today && win.endDate >= today ? "ACTIVE" : "UPCOMING",
          estimatedCost: win.estimatedCost.toString(),
          coveredShowIds: win.coveredShowIds.map(String),
          notes: win.notes || null,
        });
      }
    }

    return NextResponse.json({ success: true });
  } catch (err: any) {
    console.error("Save Watchlist Error:", err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
