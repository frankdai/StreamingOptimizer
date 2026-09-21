"use client";

import React, { useState, useEffect, useMemo, useCallback } from "react";
import { Tv, Sparkles, User, LogOut, Cloud, CheckCircle, AlertCircle } from "lucide-react";
import { Show, ViewingPreference } from "@/lib/types";
import { optimizeSubscriptions } from "@/lib/optimizer";
import { ShowSearch } from "@/components/ShowSearch";
import { WatchlistManager } from "@/components/WatchlistManager";
import { SavingsSummary } from "@/components/SavingsSummary";
import { SubscriptionTimeline } from "@/components/SubscriptionTimeline";
import { AuthModal } from "@/components/AuthModal";

// Pre-seeded demo shows for initial guest exploration
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
];

interface CurrentUser {
  id: string;
  email: string;
  name?: string | null;
}

export default function Home() {
  const [currentUser, setCurrentUser] = useState<CurrentUser | null>(null);
  const [isAuthModalOpen, setIsAuthModalOpen] = useState(false);
  const [shows, setShows] = useState<Show[]>(DEMO_SHOWS);
  const [isSyncing, setIsSyncing] = useState(false);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  // Check user session and fetch watchlist on load
  useEffect(() => {
    async function loadUser() {
      try {
        const res = await fetch("/api/auth/me");
        const data = await res.json();
        if (data.user) {
          setCurrentUser(data.user);
          // Fetch user's saved watchlist from PostgreSQL
          const wlRes = await fetch("/api/watchlist");
          if (wlRes.ok) {
            const wlData = await wlRes.json();
            if (wlData.shows && wlData.shows.length > 0) {
              setShows(wlData.shows);
            }
          }
        }
      } catch (err) {
        console.error("Failed to load user session:", err);
      }
    }
    loadUser();

    // Check for auth status params in URL
    const params = new URLSearchParams(window.location.search);
    if (params.get("auth_success")) {
      setToastMessage("🎉 Successfully signed in! Your session is active for 30 days.");
      window.history.replaceState({}, document.title, window.location.pathname);
    } else if (params.get("auth_error")) {
      setToastMessage(`⚠️ Sign-in link error: ${params.get("auth_error")}`);
      window.history.replaceState({}, document.title, window.location.pathname);
    }
  }, []);

  // Sync watchlist to PostgreSQL whenever shows change (if logged in)
  const syncToCloud = useCallback(async (updatedShows: Show[]) => {
    if (!currentUser) return;
    setIsSyncing(true);
    try {
      await fetch("/api/watchlist", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ shows: updatedShows }),
      });
    } catch (err) {
      console.error("Watchlist cloud sync error:", err);
    } finally {
      setIsSyncing(false);
    }
  }, [currentUser]);

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

      const updated = [
        ...shows,
        {
          ...newShow,
          episodes: loadedEpisodes,
        },
      ];
      setShows(updated);
      syncToCloud(updated);
    } catch (err) {
      console.error("Failed to load show episodes:", err);
      const updated = [...shows, newShow];
      setShows(updated);
      syncToCloud(updated);
    }
  };

  const handleTogglePreference = (showId: number | string, newPref: ViewingPreference) => {
    const updated = shows.map((s) => (s.id === showId ? { ...s, preference: newPref } : s));
    setShows(updated);
    syncToCloud(updated);
  };

  const handleRemoveShow = (showId: number | string) => {
    const updated = shows.filter((s) => s.id !== showId);
    setShows(updated);
    syncToCloud(updated);
  };

  const handleLogout = async () => {
    await fetch("/api/auth/logout", { method: "POST" });
    setCurrentUser(null);
    setToastMessage("Signed out successfully.");
  };

  return (
    <main className="min-h-screen pb-24">
      {/* Toast Notification */}
      {toastMessage && (
        <div className="bg-indigo-600 text-white text-xs font-semibold px-4 py-2.5 text-center flex items-center justify-center space-x-2 animate-in fade-in">
          <span>{toastMessage}</span>
          <button
            onClick={() => setToastMessage(null)}
            className="underline ml-2 text-indigo-200 hover:text-white"
          >
            Dismiss
          </button>
        </div>
      )}

      {/* Top Navigation */}
      <header className="border-b border-slate-800/80 bg-slate-950/70 backdrop-blur sticky top-0 z-40">
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

          <div className="flex items-center space-x-3 text-xs">
            {currentUser ? (
              <div className="flex items-center space-x-3">
                <div className="flex items-center space-x-2 bg-slate-900 border border-slate-800 px-3 py-1.5 rounded-lg text-slate-300">
                  <div className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                  <span className="font-medium text-slate-200">{currentUser.email}</span>
                  {isSyncing && <Cloud className="w-3 h-3 text-indigo-400 animate-bounce ml-1" />}
                </div>
                <button
                  onClick={handleLogout}
                  title="Sign Out"
                  className="p-1.5 text-slate-400 hover:text-rose-400 transition-colors"
                >
                  <LogOut className="w-4 h-4" />
                </button>
              </div>
            ) : (
              <button
                onClick={() => setIsAuthModalOpen(true)}
                className="px-3.5 py-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white font-semibold flex items-center space-x-1.5 shadow-md transition-all active:scale-95"
              >
                <User className="w-3.5 h-3.5" />
                <span>Sign In with Magic Link</span>
              </button>
            )}
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

      {/* Auth Modal */}
      <AuthModal
        isOpen={isAuthModalOpen}
        onClose={() => setIsAuthModalOpen(false)}
      />
    </main>
  );
}
