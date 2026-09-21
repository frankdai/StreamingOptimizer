import { describe, expect, it } from "vitest";
import { optimizeSubscriptions } from "../src/lib/optimizer";
import { Episode, Show } from "../src/lib/types";

describe("Stream Optimizer Engine", () => {
  // Helper to generate weekly episodes
  function generateWeeklyEpisodes(
    showId: number,
    startYear: number,
    startMonth: number,
    startDay: number,
    count: number
  ): Episode[] {
    const eps: Episode[] = [];
    const baseDate = new Date(Date.UTC(startYear, startMonth - 1, startDay));

    for (let i = 0; i < count; i++) {
      const epDate = new Date(baseDate.getTime() + i * 7 * 24 * 60 * 60 * 1000);
      eps.push({
        id: showId * 100 + i,
        showId,
        seasonNumber: 1,
        episodeNumber: i + 1,
        airDate: epDate.toISOString().split("T")[0],
      });
    }
    return eps;
  }

  it("produces 3 billing windows for a 10-week weekly LIVE show", () => {
    // 10 weeks = ~63 days apart between ep 1 and ep 10.
    // Window 1 covers days 0-30 (ep 1-5)
    // Window 2 covers days 35-65 (ep 6-10) -> wait, let's check!
    // Day 0 (Ep 1), Day 7 (Ep 2), Day 14 (Ep 3), Day 21 (Ep 4), Day 28 (Ep 5) -> Window 1 [Day 0, Day 30]
    // Day 35 (Ep 6), Day 42 (Ep 7), Day 49 (Ep 8), Day 56 (Ep 9) -> Window 2 [Day 35, Day 65]
    // Day 63 (Ep 10) falls inside [Day 35, Day 65]!
    // So 10 weeks actually fits into 2 windows!
    // What if 12 weeks (77 days)?
    // Day 70 (Ep 11) -> Window 3 [Day 70, Day 100]
    const episodes = generateWeeklyEpisodes(1, 2025, 1, 1, 12);
    const show: Show = {
      id: 1,
      tvmazeId: 101,
      title: "Severance Season 2",
      streamingService: "Apple TV+",
      status: "Running",
      episodes,
      preference: "LIVE",
    };

    const result = optimizeSubscriptions([show], { today: "2025-01-01" });

    // Apple TV+ is $9.99/mo. 12 weeks requires 3 windows:
    // Window 1: Jan 1 - Jan 31 (episodes 1-5)
    // Window 2: Feb 5 - Mar 7 (episodes 6-10)
    // Window 3: Mar 12 - Apr 11 (episodes 11-12)
    expect(result.windows.length).toBe(3);
    expect(result.totalOptimizedCost).toBeCloseTo(3 * 9.99, 2);
  });

  it("reduces a 12-week show to only 1 billing cycle when switched to BINGE_FINALE", () => {
    const episodes = generateWeeklyEpisodes(1, 2025, 1, 1, 12);
    const finaleDate = episodes[episodes.length - 1].airDate;

    const show: Show = {
      id: 1,
      tvmazeId: 101,
      title: "Severance Season 2",
      streamingService: "Apple TV+",
      status: "Running",
      episodes,
      preference: "BINGE_FINALE",
    };

    const result = optimizeSubscriptions([show], { today: "2025-01-01" });

    expect(result.windows.length).toBe(1);
    expect(result.windows[0].startDate).toBe(finaleDate);
    expect(result.totalOptimizedCost).toBeCloseTo(9.99, 2);
    expect(result.totalSaved).toBeGreaterThan(0);
  });

  it("applies the Free-Rider synergy: Binge show gets $0 marginal cost on an existing active window", () => {
    // Show A is LIVE spanning Jan 1 to Apr 11 (3 windows)
    const episodesA = generateWeeklyEpisodes(1, 2025, 1, 1, 12);
    const showA: Show = {
      id: 1,
      tvmazeId: 101,
      title: "Show A (Live)",
      streamingService: "Apple TV+",
      status: "Running",
      episodes: episodesA,
      preference: "LIVE",
    };

    // Show B has its finale on Feb 20, 2025 (inside Window 2: Feb 5 - Mar 7)
    const showB: Show = {
      id: 2,
      tvmazeId: 102,
      title: "Show B (Binge)",
      streamingService: "Apple TV+",
      status: "Running",
      episodes: [
        { id: 201, showId: 2, seasonNumber: 1, episodeNumber: 1, airDate: "2025-01-15" },
        { id: 202, showId: 2, seasonNumber: 1, episodeNumber: 2, airDate: "2025-02-20" },
      ],
      preference: "BINGE_FINALE",
    };

    const result = optimizeSubscriptions([showA, showB], { today: "2025-01-01" });

    // Show B should NOT add any new windows because it fits into Window 2 of Show A!
    expect(result.windows.length).toBe(3);
    expect(result.totalOptimizedCost).toBeCloseTo(3 * 9.99, 2);

    // Verify Show B is listed as covered in one of the windows
    const windowWithB = result.windows.find((w) => w.coveredShowIds.includes(2));
    expect(windowWithB).toBeDefined();
    expect(windowWithB?.notes).toContain("Includes binge for Show B (Binge) ($0 extra)");
  });

  it("clusters two BINGE shows on the same service into a single 30-day window", () => {
    // Show C finale: Oct 5, 2025
    // Show D finale: Oct 20, 2025 (15 days apart, < 30 days)
    const showC: Show = {
      id: 3,
      tvmazeId: 103,
      title: "Show C",
      streamingService: "Max",
      status: "Running",
      episodes: [
        { id: 301, showId: 3, seasonNumber: 1, episodeNumber: 1, airDate: "2025-10-05" },
      ],
      preference: "BINGE_FINALE",
    };

    const showD: Show = {
      id: 4,
      tvmazeId: 104,
      title: "Show D",
      streamingService: "Max",
      status: "Running",
      episodes: [
        { id: 401, showId: 4, seasonNumber: 1, episodeNumber: 1, airDate: "2025-10-20" },
      ],
      preference: "BINGE_FINALE",
    };

    const result = optimizeSubscriptions([showC, showD], { today: "2025-09-01" });

    // Both should cluster into 1 single window starting on Oct 20
    expect(result.windows.length).toBe(1);
    expect(result.windows[0].startDate).toBe("2025-10-20");
    expect(result.windows[0].coveredShowIds).toEqual([3, 4]);
    expect(result.totalOptimizedCost).toBeCloseTo(16.99, 2); // Max is $16.99
  });
});
