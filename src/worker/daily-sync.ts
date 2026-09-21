import { db } from "../lib/db";
import { episodes, shows, subscriptionPlans, users, userWatchlist } from "../lib/db/schema";
import { eq, and, isNull, lte, gte } from "drizzle-orm";
import { getShowEpisodes, resolveStreamingPlatform } from "../lib/tvmaze";
import { optimizeSubscriptions, formatDate } from "../lib/optimizer";
import { getMailer } from "../lib/email/mailer";
import { generateCancelAlertEmail, generateSubscribeAlertEmail } from "../lib/email/templates";
import { Episode, Show, ViewingPreference } from "../lib/types";

export async function runDailySync() {
  console.log("=================================================");
  console.log(`[Daily Sync Worker] Starting at ${new Date().toISOString()}`);
  console.log("=================================================");

  const mailer = getMailer();
  const today = formatDate(new Date());

  // -------------------------------------------------------------
  // Step 1: Sync Show & Episode Metadata from TVmaze
  // -------------------------------------------------------------
  console.log("[Step 1] Syncing active shows from TVmaze...");
  const activeShows = await db.select().from(shows);
  console.log(`Found ${activeShows.length} tracked shows in database.`);

  for (const showRecord of activeShows) {
    try {
      console.log(`- Syncing episodes for: "${showRecord.title}" (TVmaze ID: ${showRecord.tvmazeId})`);
      const rawEpisodes = await getShowEpisodes(showRecord.tvmazeId);

      // Upsert/replace episodes in database
      // Delete existing and insert latest
      await db.delete(episodes).where(eq(episodes.showId, showRecord.id));

      if (rawEpisodes.length > 0) {
        await db.insert(episodes).values(
          rawEpisodes.map((ep) => ({
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

      await db
        .update(shows)
        .set({ lastSyncedAt: new Date() })
        .where(eq(shows.id, showRecord.id));
    } catch (err: any) {
      console.error(`Failed to sync show ${showRecord.title}: ${err.message}`);
    }
  }

  // -------------------------------------------------------------
  // Step 2: Re-optimize Future Horizons for Each User
  // -------------------------------------------------------------
  console.log("\n[Step 2] Re-optimizing subscription plans per user...");
  const allUsers = await db.select().from(users);

  for (const user of allUsers) {
    console.log(`- Optimizing for user: ${user.email}`);

    // Fetch user's watchlist with shows and episodes
    const watchlistItems = await db
      .select({
        watchlistId: userWatchlist.id,
        preference: userWatchlist.preference,
        show: shows,
      })
      .from(userWatchlist)
      .innerJoin(shows, eq(userWatchlist.showId, shows.id))
      .where(eq(userWatchlist.userId, user.id));

    if (watchlistItems.length === 0) continue;

    const userShows: Show[] = [];
    for (const item of watchlistItems) {
      const showEpisodes = await db
        .select()
        .from(episodes)
        .where(eq(episodes.showId, item.show.id));

      userShows.push({
        id: item.show.id,
        tvmazeId: item.show.tvmazeId,
        title: item.show.title,
        streamingService: item.show.streamingService,
        status: item.show.status,
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
        preference: item.preference as ViewingPreference,
      });
    }

    // Run Optimization Solver
    const result = optimizeSubscriptions(userShows, { today });

    // Lock ACTIVE and COMPLETED windows; only replace UPCOMING windows
    await db
      .delete(subscriptionPlans)
      .where(and(eq(subscriptionPlans.userId, user.id), eq(subscriptionPlans.status, "UPCOMING")));

    // Insert new computed windows that start today or in future
    for (const win of result.windows) {
      // If window start date is in the future
      if (win.startDate > today) {
        await db.insert(subscriptionPlans).values({
          userId: user.id,
          streamingService: win.streamingService,
          startDate: win.startDate,
          endDate: win.endDate,
          status: "UPCOMING",
          estimatedCost: win.estimatedCost.toString(),
          coveredShowIds: win.coveredShowIds.map(String),
          notes: win.notes || null,
        });
      }
    }
  }

  // -------------------------------------------------------------
  // Step 3: Dispatch Alerts (Subscribe & Cancel)
  // -------------------------------------------------------------
  console.log("\n[Step 3] Evaluating email notifications...");

  // 1. Windows starting within next 2 days
  const upcomingStarts = await db
    .select({
      plan: subscriptionPlans,
      user: users,
    })
    .from(subscriptionPlans)
    .innerJoin(users, eq(subscriptionPlans.userId, users.id))
    .where(
      and(
        isNull(subscriptionPlans.startEmailSentAt),
        lte(subscriptionPlans.startDate, today) // or starting very soon
      )
    );

  for (const { plan, user } of upcomingStarts) {
    console.log(`Sending SUBSCRIBE alert to ${user.email} for ${plan.streamingService}...`);
    const emailContent = generateSubscribeAlertEmail({
      userName: user.name || undefined,
      streamingService: plan.streamingService,
      startDate: plan.startDate,
      endDate: plan.endDate,
      cost: Number(plan.estimatedCost),
      coveredShowTitles: plan.coveredShowIds,
    });

    await mailer.sendEmail({
      to: user.email,
      ...emailContent,
    });

    await db
      .update(subscriptionPlans)
      .set({ startEmailSentAt: new Date() })
      .where(eq(subscriptionPlans.id, plan.id));
  }

  // 2. Windows ending within 2 days
  const upcomingEnds = await db
    .select({
      plan: subscriptionPlans,
      user: users,
    })
    .from(subscriptionPlans)
    .innerJoin(users, eq(subscriptionPlans.userId, users.id))
    .where(
      and(
        isNull(subscriptionPlans.cancelEmailSentAt),
        lte(subscriptionPlans.endDate, today)
      )
    );

  for (const { plan, user } of upcomingEnds) {
    console.log(`Sending CANCEL alert to ${user.email} for ${plan.streamingService}...`);
    const emailContent = generateCancelAlertEmail({
      userName: user.name || undefined,
      streamingService: plan.streamingService,
      startDate: plan.startDate,
      endDate: plan.endDate,
      cost: Number(plan.estimatedCost),
      coveredShowTitles: plan.coveredShowIds,
    });

    await mailer.sendEmail({
      to: user.email,
      ...emailContent,
    });

    await db
      .update(subscriptionPlans)
      .set({ cancelEmailSentAt: new Date() })
      .where(eq(subscriptionPlans.id, plan.id));
  }

  console.log("\n[Daily Sync Worker] Completed successfully!");
}

// Allow direct CLI execution: `npm run worker:run`
if (process.argv[1]?.includes("daily-sync")) {
  runDailySync()
    .then(() => process.exit(0))
    .catch((err) => {
      console.error("[Daily Sync Fatal Error]", err);
      process.exit(1);
    });
}
