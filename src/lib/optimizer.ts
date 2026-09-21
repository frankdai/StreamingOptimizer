import {
  DEFAULT_PLATFORM_COST,
  Episode,
  OptimizationResult,
  Show,
  STREAMING_PLATFORMS,
  SubscriptionWindow,
} from "./types";

const WINDOW_DAYS = 30;

/**
 * Format a Date to YYYY-MM-DD string
 */
export function formatDate(d: Date): string {
  return d.toISOString().split("T")[0];
}

/**
 * Parse YYYY-MM-DD safely into a UTC Date
 */
export function parseDate(dateStr: string): Date {
  const [year, month, day] = dateStr.split("-").map(Number);
  return new Date(Date.UTC(year, month - 1, day));
}

/**
 * Add days to a Date object in UTC
 */
export function addDays(date: Date, days: number): Date {
  const result = new Date(date.getTime());
  result.setUTCDate(result.getUTCDate() + days);
  return result;
}

/**
 * Check if date target falls inside [startDate, endDate] inclusive
 */
export function isDateInside(target: string, start: string, end: string): boolean {
  return target >= start && target <= end;
}

/**
 * Get difference in days between two YYYY-MM-DD dates
 */
export function diffInDays(startStr: string, endStr: string): number {
  const start = parseDate(startStr);
  const end = parseDate(endStr);
  return Math.round((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24));
}

/**
 * Optimizes subscription windows for a set of shows based on user preferences.
 * Complexity: O(E log E) where E is the total number of episodes.
 */
export function optimizeSubscriptions(
  shows: Show[],
  options?: {
    today?: string; // YYYY-MM-DD reference date
  }
): OptimizationResult {
  const today = options?.today || formatDate(new Date());

  if (shows.length === 0) {
    return {
      windows: [],
      totalOptimizedCost: 0,
      alwaysSubscribedCost: 0,
      totalSaved: 0,
      savingsPercentage: 0,
      activeServiceMonths: 0,
      byService: {},
    };
  }

  // Group shows by streaming service
  const showsByService: Record<string, Show[]> = {};
  for (const show of shows) {
    const service = show.streamingService || "Other";
    if (!showsByService[service]) {
      showsByService[service] = [];
    }
    showsByService[service].push(show);
  }

  const allWindows: SubscriptionWindow[] = [];
  const byServiceResult: OptimizationResult["byService"] = {};
  let totalOptimizedCost = 0;
  let totalAlwaysSubscribedCost = 0;

  for (const [service, serviceShows] of Object.entries(showsByService)) {
    const platformInfo = STREAMING_PLATFORMS[service];
    const monthlyCost = platformInfo ? platformInfo.monthlyCost : DEFAULT_PLATFORM_COST;

    const liveShows = serviceShows.filter((s) => s.preference === "LIVE");
    const bingeShows = serviceShows.filter((s) => s.preference === "BINGE_FINALE");

    const serviceWindows: SubscriptionWindow[] = [];

    // =========================================================================
    // Phase 1: Process "LIVE" shows using Greedy 30-Day Window Covering
    // =========================================================================
    // Collect all episodes for live shows that air today or in the future
    interface LiveAirItem {
      showId: number | string;
      showTitle: string;
      airDate: string;
    }

    const liveAirDates: LiveAirItem[] = [];
    for (const show of liveShows) {
      // Find all episodes that air today or future
      const relevantEps = show.episodes.filter((ep) => ep.airDate >= today);
      // If no future episodes, but show has episodes, consider the latest one
      if (relevantEps.length === 0 && show.episodes.length > 0) {
        const lastEp = show.episodes[show.episodes.length - 1];
        if (lastEp.airDate >= today) {
          relevantEps.push(lastEp);
        }
      }
      for (const ep of relevantEps) {
        liveAirDates.push({
          showId: show.id,
          showTitle: show.title,
          airDate: ep.airDate,
        });
      }
    }

    // Sort live air dates chronologically
    liveAirDates.sort((a, b) => a.airDate.localeCompare(b.airDate));

    // Greedy 30-day window covering
    let ptr = 0;
    while (ptr < liveAirDates.length) {
      const windowStart = liveAirDates[ptr].airDate;
      const windowEnd = formatDate(addDays(parseDate(windowStart), WINDOW_DAYS));

      const coveredShowIds = new Set<number | string>();
      const coveredShowTitles = new Set<string>();

      while (ptr < liveAirDates.length && liveAirDates[ptr].airDate <= windowEnd) {
        coveredShowIds.add(liveAirDates[ptr].showId);
        coveredShowTitles.add(liveAirDates[ptr].showTitle);
        ptr++;
      }

      serviceWindows.push({
        streamingService: service,
        startDate: windowStart,
        endDate: windowEnd,
        status: windowStart <= today && windowEnd >= today ? "ACTIVE" : "UPCOMING",
        estimatedCost: monthlyCost,
        coveredShowIds: Array.from(coveredShowIds),
        coveredShowTitles: Array.from(coveredShowTitles),
        notes: "Scheduled for live weekly air dates",
      });
    }

    // =========================================================================
    // Phase 2: "BINGE_FINALE" shows: Free-Rider Piggybacking + Clustering
    // =========================================================================
    interface BingeShowItem {
      show: Show;
      finaleDate: string;
      isAssigned: boolean;
    }

    const bingeItems: BingeShowItem[] = bingeShows.map((show) => {
      let finaleDate = today;
      if (show.episodes.length > 0) {
        // Sort episodes to find last one
        const sortedEps = [...show.episodes].sort((a, b) => a.airDate.localeCompare(b.airDate));
        const lastEp = sortedEps[sortedEps.length - 1];
        finaleDate = lastEp.airDate < today ? today : lastEp.airDate;
      }
      return {
        show,
        finaleDate,
        isAssigned: false,
      };
    });

    // Step 2a: Free-Rider Piggybacking: Check if any binge show can fit into an existing LIVE window
    for (const item of bingeItems) {
      for (const win of serviceWindows) {
        // If the finale airs before or on the window's end date, and user has time to watch in this window
        if (item.finaleDate <= win.endDate) {
          item.isAssigned = true;
          if (!win.coveredShowIds.includes(item.show.id)) {
            win.coveredShowIds.push(item.show.id);
            win.coveredShowTitles.push(item.show.title);
            win.notes = (win.notes ? win.notes + "; " : "") + `Includes binge for ${item.show.title} ($0 extra)`;
          }
          break;
        }
      }
    }

    // Step 2b: Cluster remaining unassigned binge shows into minimal 30-day windows
    const unassignedBinge = bingeItems.filter((item) => !item.isAssigned);
    unassignedBinge.sort((a, b) => a.finaleDate.localeCompare(b.finaleDate));

    let bIdx = 0;
    while (bIdx < unassignedBinge.length) {
      // Cluster window starts at the latest finale of groupable shows within 30 days,
      // or simply at the finale date of the current show
      const firstItem = unassignedBinge[bIdx];
      let windowStart = firstItem.finaleDate;

      // Check if another show's finale drops within 30 days so we can shift start to cover both!
      let nextIdx = bIdx + 1;
      let clusterEndCandidate = formatDate(addDays(parseDate(windowStart), WINDOW_DAYS));

      while (
        nextIdx < unassignedBinge.length &&
        diffInDays(firstItem.finaleDate, unassignedBinge[nextIdx].finaleDate) <= WINDOW_DAYS
      ) {
        // If we shift the window start to the later show's finale, does it still make sense?
        // Yes! Once the earlier show is fully aired, it stays available indefinitely.
        // So starting at the LATER finale allows binging both in 1 window!
        windowStart = unassignedBinge[nextIdx].finaleDate;
        clusterEndCandidate = formatDate(addDays(parseDate(windowStart), WINDOW_DAYS));
        nextIdx++;
      }

      const coveredIds: (number | string)[] = [];
      const coveredTitles: string[] = [];

      for (let i = bIdx; i < nextIdx; i++) {
        unassignedBinge[i].isAssigned = true;
        coveredIds.push(unassignedBinge[i].show.id);
        coveredTitles.push(unassignedBinge[i].show.title);
      }

      serviceWindows.push({
        streamingService: service,
        startDate: windowStart,
        endDate: clusterEndCandidate,
        status: windowStart <= today && clusterEndCandidate >= today ? "ACTIVE" : "UPCOMING",
        estimatedCost: monthlyCost,
        coveredShowIds: coveredIds,
        coveredShowTitles: coveredTitles,
        notes: `Season binge window (${coveredTitles.length} show${coveredTitles.length > 1 ? "s" : ""})`,
      });

      bIdx = nextIdx;
    }

    // Sort all windows for this service chronologically
    serviceWindows.sort((a, b) => a.startDate.localeCompare(b.startDate));

    // Calculate baseline "Always Subscribed" cost for this service:
    // A user who never cancels pays every month from the earliest relevant episode date
    // through the end of the last required watch window.
    let serviceAlwaysCost = 0;
    if (serviceWindows.length > 0) {
      // Find earliest date across all shows on this service
      let earliestDate = serviceWindows[0].startDate;
      for (const show of serviceShows) {
        for (const ep of show.episodes) {
          if (ep.airDate && ep.airDate < earliestDate) {
            earliestDate = ep.airDate;
          }
        }
      }
      const latestDate = serviceWindows[serviceWindows.length - 1].endDate;
      const totalSpanDays = Math.max(WINDOW_DAYS, diffInDays(earliestDate, latestDate));
      const baselineMonths = Math.max(serviceWindows.length, Math.ceil(totalSpanDays / 30));
      serviceAlwaysCost = baselineMonths * monthlyCost;
    }

    const serviceCost = serviceWindows.reduce((acc, w) => acc + w.estimatedCost, 0);

    totalOptimizedCost += serviceCost;
    totalAlwaysSubscribedCost += serviceAlwaysCost;

    byServiceResult[service] = {
      service,
      windows: serviceWindows,
      totalCost: serviceCost,
      showCount: serviceShows.length,
    };

    allWindows.push(...serviceWindows);
  }

  // Sort overall windows across all services chronologically
  allWindows.sort((a, b) => a.startDate.localeCompare(b.startDate));

  const totalSaved = Math.max(0, totalAlwaysSubscribedCost - totalOptimizedCost);
  const savingsPercentage =
    totalAlwaysSubscribedCost > 0 ? Math.round((totalSaved / totalAlwaysSubscribedCost) * 100) : 0;

  return {
    windows: allWindows,
    totalOptimizedCost: Number(totalOptimizedCost.toFixed(2)),
    alwaysSubscribedCost: Number(totalAlwaysSubscribedCost.toFixed(2)),
    totalSaved: Number(totalSaved.toFixed(2)),
    savingsPercentage,
    activeServiceMonths: allWindows.length,
    byService: byServiceResult,
  };
}
