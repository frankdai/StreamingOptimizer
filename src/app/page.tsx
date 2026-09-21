"use client";

import React, { useState, useMemo } from "react";
import { Tv, Sparkles, PlusCircle } from "lucide-react";
import { Show, ViewingPreference } from "@/lib/types";
import { optimizeSubscriptions } from "@/lib/optimizer";
import { ShowSearch } from "@/components/ShowSearch";
import { WatchlistManager } from "@/components/WatchlistManager";
import { SavingsSummary } from "@/components/SavingsSummary";
import { SubscriptionTimeline } from "@/components/SubscriptionTimeline";

// Pre-seeded demo shows for instant 1-click test
const DEMO_SHOWS: Show[] = [
  {
    id: "demo-severance",
    tvmazeId: 44458,
    title: "Severance (Season 2)",
    streamingService: "Apple TV+",
    status: "Running",
    imageMedium: "https://static.tvmaze.com/uploads/images/medium_portrait/499/1247926.jpg",
    preference: "LIVE",
    episodes: [
      { id: 1, showId: "demo-severance", seasonNumber: 2, episodeNumber: 1, airDate: "2025-01-17" },
      { id: 2, showId: "demo-severance", seasonNumber: 2, episodeNumber: 2, airDate: "2025-01-24" },
      { id: 3, showId: "demo-severance", seasonNumber: 2, episodeNumber: 3, airDate: "2025-01-31" },
      { id: 4, showId: "demo-severance", seasonNumber: 2, episodeNumber: 4, airDate: "2025-02-07" },
      { id: 5, showId: "demo-severance", seasonNumber: 2, episodeNumber: 5, airDate: "2025-02-14" },
      { id: 6, showId: "demo-severance", seasonNumber: 2, episodeNumber: 6, airDate: "2025-02-21" },
      { id: 7, showId: "demo-severance", seasonNumber: 2, episodeNumber: 7, airDate: "2025-02-28" },
      { id: 8, showId: "demo-severance", seasonNumber: 2, episodeNumber: 8, airDate: "2025-03-07" },
      { id: 9, showId: "demo-severance", seasonNumber: 2, episodeNumber: 9, airDate: "2025-03-14" },
      { id: 10, showId: "demo-severance", seasonNumber: 2, episodeNumber: 10, airDate: "2025-03-21" },
    ],
  },
  {
    id: "demo-penguin",
    tvmazeId: 57530,
    title: "The Penguin",
    streamingService: "Max",
    status: "Ended",
    imageMedium: "https://static.tvmaze.com/uploads/images/medium_portrait/529/1324317.jpg",
    preference: "BINGE_FINALE",
    episodes: [
      { id: 11, showId: "demo-penguin", seasonNumber: 1, episodeNumber: 1, airDate: "2024-09-19" },
      { id: 12, showId: "demo-penguin", seasonNumber: 1, episodeNumber: 2, airDate: "2024-09-29" },
      { id: 13, showId: "demo-penguin", seasonNumber: 1, episodeNumber: 3, airDate: "2024-10-06" },
      { id: 14, showId: "demo-penguin", seasonNumber: 1, episodeNumber: 4, airDate: "2024-10-13" },
      { id: 15, showId: "demo-penguin", seasonNumber: 1, episodeNumber: 5, airDate: "2024-10-20" },
      { id: 16, showId: "demo-penguin", seasonNumber: 1, episodeNumber: 6, airDate: "2024-10-27" },
      { id: 17, showId: "demo-penguin", seasonNumber: 1, episodeNumber: 7, airDate: "2024-11-03" },
      { id: 18, showId: "demo-penguin", seasonNumber: 1, episodeNumber: 8, airDate: "2024-11-10" },
    ],
  },
  {
    id: "demo-dune-prophecy",
    tvmazeId: 44400,
    title: "Dune: Prophecy",
    streamingService: "Max",
    status: "Running",
    imageMedium: "https://static.tvmaze.com/uploads/images/medium_portrait/542/1356784.jpg",
    preference: "BINGE_FINALE",
    episodes: [
      { id: 21, showId: "demo-dune-prophecy", seasonNumber: 1, episodeNumber: 1, airDate: "2024-11-17" },
      { id: 22, showId: "demo-dune-prophecy", seasonNumber: 1, episodeNumber: 2, airDate: "2024-11-24" },
      { id: 23, showId: "demo-dune-prophecy", seasonNumber: 1, episodeNumber: 3, airDate: "2024-12-01" },
      { id: 24, showId: "demo-dune-prophecy", seasonNumber: 1, episodeNumber: 4, airDate: "2024-12-08" },
      { id: 25, showId: "demo-dune-prophecy", seasonNumber: 1, episodeNumber: 5, airDate: "2024-12-15" },
      { id: 26, showId: "demo-dune-prophecy", seasonNumber: 1, episodeNumber: 6, airDate: "2024-12-22" },
    ],
  },
];

export default function Home() {
  const [shows, setShows] = useState<Show[]>(DEMO_SHOWS);

  // Compute optimization reactively in < 1ms
  const optimizationResult = useMemo(() => {
    return optimizeSubscriptions(shows);
  }, [shows]);

  const handleAddShow = async (newShow: Show) => {
    try {
      // Fetch full episodic schedule from API
      const res = await fetch(`/api/shows/${newShow.tvmazeId}/schedule`);
      const data = await res.json();
      const loadedEpisodes = data.episodes || [];

      setShows((prev) => [
        ...prev,
        {
          ...newShow,
          episodes: loadedEpisodes,
        },
      ]);
    } catch (err) {
      console.error("Failed to load show episodes:", err);
      // Add anyway with empty episodes
      setShows((prev) => [...prev, newShow]);
    }
  };

  const handleTogglePreference = (showId: number | string, newPref: ViewingPreference) => {
    setShows((prev) =>
      prev.map((s) => (s.id === showId ? { ...s, preference: newPref } : s))
    );
  };

  const handleRemoveShow = (showId: number | string) => {
    setShows((prev) => prev.filter((s) => s.id !== showId));
  };

  const handleLoadDemo = () => {
    setShows(DEMO_SHOWS);
  };

  return (
    <main className="min-h-screen pb-24">
      {/* Top Navigation */}
      <header className="border-b border-slate-800/80 bg-slate-950/60 backdrop-blur sticky top-0 z-40">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-indigo-600 to-violet-500 flex items-center justify-center shadow-lg shadow-indigo-500/20">
              <Tv className="w-5 h-5 text-white" />
            </div>
            <div>
              <span className="font-extrabold text-slate-100 tracking-tight text-lg">StreamOptimizer</span>
              <span className="text-[10px] uppercase font-bold text-indigo-400 bg-indigo-950/70 border border-indigo-800/60 px-1.5 py-0.5 rounded ml-2">
                Open Source
              </span>
            </div>
          </div>

          <div className="flex items-center space-x-3 text-xs text-slate-400">
            <button
              onClick={handleLoadDemo}
              className="px-3 py-1.5 rounded-lg border border-slate-800 bg-slate-900/60 hover:bg-slate-800 text-slate-300 font-medium transition-colors flex items-center space-x-1.5"
            >
              <Sparkles className="w-3.5 h-3.5 text-amber-400" />
              <span>Reset Demo Shows</span>
            </button>
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <section className="max-w-6xl mx-auto px-4 sm:px-6 pt-10 pb-6 text-center">
        <h1 className="text-3xl sm:text-5xl font-black text-slate-100 tracking-tight max-w-3xl mx-auto leading-tight">
          Watch Everything You Love. <br />
          <span className="bg-gradient-to-r from-indigo-400 via-sky-400 to-emerald-400 bg-clip-text text-transparent">
            Never Pay for Idle Months.
          </span>
        </h1>
        <p className="mt-3.5 text-sm sm:text-base text-slate-400 max-w-2xl mx-auto leading-relaxed">
          Streaming services bill on non-prorated 30-day blocks. Select your shows, choose whether to follow along weekly or wait for the finale, and let our optimizer time your subscriptions to perfection.
        </p>

        {/* Search Bar */}
        <div className="mt-8 flex justify-center">
          <ShowSearch
            onAddShow={handleAddShow}
            existingShowIds={shows.map((s) => s.id)}
          />
        </div>
      </section>

      {/* Main Content Dashboard */}
      <section className="max-w-6xl mx-auto px-4 sm:px-6 space-y-8 mt-4">
        {/* Financial Metrics and Action Plan */}
        <SavingsSummary result={optimizationResult} />

        {/* Visual Timeline (Gantt) */}
        <SubscriptionTimeline result={optimizationResult} shows={shows} />

        {/* Watchlist with Preference Toggles */}
        <WatchlistManager
          shows={shows}
          onTogglePreference={handleTogglePreference}
          onRemoveShow={handleRemoveShow}
        />
      </section>
    </main>
  );
}
