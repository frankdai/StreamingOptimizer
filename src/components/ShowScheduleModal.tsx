"use client";

import React, { useState, useEffect, useMemo } from "react";
import { X, Calendar, Clock, Radio, Layers, CheckCircle2 } from "lucide-react";
import { Episode, Show, STREAMING_PLATFORMS, ViewingPreference } from "@/lib/types";
import { formatDate } from "@/lib/optimizer";

interface ShowScheduleModalProps {
  show: Show;
  onClose: () => void;
  onTogglePreference?: (showId: number | string, newPref: ViewingPreference) => void;
}

export function ShowScheduleModal({
  show,
  onClose,
  onTogglePreference,
}: ShowScheduleModalProps) {
  const [activeSeason, setActiveSeason] = useState<number>(1);
  const [episodes, setEpisodes] = useState<Episode[]>(show.episodes || []);
  const [isLoading, setIsLoading] = useState(false);

  const today = useMemo(() => formatDate(new Date()), []);

  // Group episodes by season - always called unconditionally at the top level
  const episodesBySeason = useMemo(() => {
    const map: Record<number, Episode[]> = {};
    for (const ep of episodes) {
      if (!map[ep.seasonNumber]) map[ep.seasonNumber] = [];
      map[ep.seasonNumber].push(ep);
    }
    // Sort episodes in each season by episodeNumber
    for (const s of Object.keys(map)) {
      map[Number(s)].sort((a, b) => a.episodeNumber - b.episodeNumber);
    }
    return map;
  }, [episodes]);

  // Sync episodes or fetch if empty
  useEffect(() => {
    if (show.episodes && show.episodes.length > 0) {
      setEpisodes(show.episodes);
      const seasons = Array.from(new Set(show.episodes.map((e) => e.seasonNumber))).sort(
        (a, b) => b - a
      );
      if (seasons.length > 0) setActiveSeason(seasons[0]);
    } else {
      setIsLoading(true);
      fetch(`/api/shows/${show.tvmazeId}/schedule`)
        .then((res) => res.json())
        .then((data) => {
          if (data.episodes) {
            setEpisodes(data.episodes);
            const seasons = Array.from(
              new Set<number>(data.episodes.map((e: Episode) => e.seasonNumber))
            ).sort((a, b) => b - a);
            if (seasons.length > 0) setActiveSeason(seasons[0]);
          }
        })
        .catch((err) => console.error("Failed to load schedule:", err))
        .finally(() => setIsLoading(false));
    }
  }, [show.id, show.tvmazeId, show.episodes]);

  // Handle ESC key to close
  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
    }
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [onClose]);

  const platform = STREAMING_PLATFORMS[show.streamingService];

  const seasonsList = Object.keys(episodesBySeason)
    .map(Number)
    .sort((a, b) => b - a); // descending: newest season first

  const currentSeasonEpisodes = episodesBySeason[activeSeason] || [];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 bg-black/80 backdrop-blur-md animate-in fade-in duration-200">
      <div className="relative w-full max-w-2xl max-h-[90vh] bg-slate-900 border border-slate-700/80 rounded-2xl shadow-2xl flex flex-col overflow-hidden">
        {/* Modal Header */}
        <div className="p-5 border-b border-slate-800 bg-slate-950/60 flex items-start justify-between space-x-4">
          <div className="flex items-center space-x-4 min-w-0">
            {show.imageMedium ? (
              <img
                src={show.imageMedium}
                alt={show.title}
                className="w-14 h-20 object-cover rounded-lg shadow-md bg-slate-800 flex-shrink-0"
              />
            ) : (
              <div className="w-14 h-20 bg-slate-800 rounded-lg flex items-center justify-center flex-shrink-0 text-xs text-slate-500">
                Poster
              </div>
            )}
            <div className="min-w-0">
              <div className="flex items-center space-x-2">
                <h3 className="text-lg sm:text-xl font-bold text-slate-100 truncate">
                  {show.title}
                </h3>
              </div>

              <div className="flex flex-wrap items-center gap-2 mt-1.5">
                <span
                  className="text-xs px-2.5 py-0.5 rounded font-bold border"
                  style={{
                    backgroundColor: `${platform?.color || "#334155"}25`,
                    borderColor: `${platform?.color || "#475569"}60`,
                    color: platform?.color || "#94a3b8",
                  }}
                >
                  {show.streamingService}
                </span>

                <span className="text-xs px-2 py-0.5 rounded bg-slate-800 text-slate-400 capitalize">
                  Status: {show.status}
                </span>

                <span className="text-xs text-slate-400">
                  {episodes.length} total episode{episodes.length !== 1 ? "s" : ""}
                </span>
              </div>

              {/* Preference toggle in header */}
              {onTogglePreference && (
                <div className="mt-2.5 flex items-center space-x-2 text-xs">
                  <span className="text-slate-400">Viewing Strategy:</span>
                  <div className="inline-flex bg-slate-950 p-0.5 rounded-lg border border-slate-800">
                    <button
                      onClick={() => onTogglePreference(show.id, "LIVE")}
                      className={`px-2 py-0.5 rounded font-medium flex items-center space-x-1 transition-all ${
                        show.preference === "LIVE"
                          ? "bg-indigo-600 text-white shadow-sm"
                          : "text-slate-400 hover:text-slate-200"
                      }`}
                    >
                      <Radio className="w-3 h-3" />
                      <span>Live</span>
                    </button>
                    <button
                      onClick={() => onTogglePreference(show.id, "BINGE_FINALE")}
                      className={`px-2 py-0.5 rounded font-medium flex items-center space-x-1 transition-all ${
                        show.preference === "BINGE_FINALE"
                          ? "bg-emerald-600 text-white shadow-sm"
                          : "text-slate-400 hover:text-slate-200"
                      }`}
                    >
                      <Layers className="w-3 h-3" />
                      <span>Wait for Finale</span>
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>

          <button
            onClick={onClose}
            className="text-slate-400 hover:text-slate-100 p-1.5 rounded-lg bg-slate-800/60 hover:bg-slate-800 transition-colors flex-shrink-0"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Season Selector Tabs */}
        {seasonsList.length > 0 && (
          <div className="flex items-center space-x-2 px-5 py-3 border-b border-slate-800 bg-slate-900/90 overflow-x-auto">
            <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider mr-1 flex-shrink-0">
              Season:
            </span>
            {seasonsList.map((season) => (
              <button
                key={season}
                onClick={() => setActiveSeason(season)}
                className={`px-3 py-1 rounded-lg text-xs font-bold transition-all flex-shrink-0 ${
                  activeSeason === season
                    ? "bg-indigo-600 text-white shadow-sm"
                    : "bg-slate-800 text-slate-400 hover:bg-slate-700 hover:text-slate-200"
                }`}
              >
                Season {season} ({episodesBySeason[season]?.length || 0})
              </button>
            ))}
          </div>
        )}

        {/* Episodes Schedule List */}
        <div className="flex-1 overflow-y-auto p-5 space-y-2.5">
          {isLoading ? (
            <div className="py-12 text-center text-slate-400 text-sm">
              Loading episode schedule from TVmaze...
            </div>
          ) : currentSeasonEpisodes.length === 0 ? (
            <div className="py-12 text-center text-slate-500 text-sm">
              No episode release dates available for this season yet.
            </div>
          ) : (
            currentSeasonEpisodes.map((ep) => {
              const isPast = ep.airDate < today;
              const isToday = ep.airDate === today;

              return (
                <div
                  key={ep.id}
                  className={`flex flex-col sm:flex-row sm:items-center justify-between p-3.5 rounded-xl border transition-all ${
                    isPast
                      ? "bg-slate-950/40 border-slate-800/60 text-slate-400"
                      : isToday
                      ? "bg-indigo-950/40 border-indigo-500/50 text-slate-100 shadow-md ring-1 ring-indigo-500/30"
                      : "bg-slate-950/80 border-slate-800 text-slate-200"
                  }`}
                >
                  <div className="flex items-start space-x-3 min-w-0">
                    <span
                      className={`text-xs font-mono font-bold px-2 py-1 rounded flex-shrink-0 mt-0.5 ${
                        isPast
                          ? "bg-slate-800 text-slate-400"
                          : isToday
                          ? "bg-indigo-600 text-white"
                          : "bg-indigo-950 text-indigo-300 border border-indigo-800/60"
                      }`}
                    >
                      E{String(ep.episodeNumber).padStart(2, "0")}
                    </span>

                    <div className="min-w-0">
                      <h4
                        className={`text-sm font-semibold truncate ${
                          isPast ? "text-slate-300" : "text-slate-100"
                        }`}
                      >
                        {ep.name || `Episode ${ep.episodeNumber}`}
                      </h4>
                      {ep.runtime && (
                        <span className="text-[11px] text-slate-400 flex items-center space-x-1 mt-0.5">
                          <Clock className="w-3 h-3" />
                          <span>{ep.runtime} min</span>
                        </span>
                      )}
                    </div>
                  </div>

                  <div className="flex items-center space-x-3 mt-2 sm:mt-0 pt-2 sm:pt-0 border-t sm:border-t-0 border-slate-800/80 flex-shrink-0 justify-between sm:justify-end">
                    <div className="flex items-center space-x-1.5 text-xs text-slate-400">
                      <Calendar className="w-3.5 h-3.5 text-slate-400" />
                      <span className="font-mono">{ep.airDate}</span>
                    </div>

                    {isPast ? (
                      <span className="text-[11px] font-semibold text-slate-400 bg-slate-800/80 px-2 py-0.5 rounded-full flex items-center space-x-1">
                        <CheckCircle2 className="w-3 h-3 text-slate-400" />
                        <span>Aired</span>
                      </span>
                    ) : isToday ? (
                      <span className="text-[11px] font-bold text-indigo-300 bg-indigo-900/80 border border-indigo-600 px-2 py-0.5 rounded-full flex items-center space-x-1 animate-pulse">
                        <span>Airs Today!</span>
                      </span>
                    ) : (
                      <span className="text-[11px] font-semibold text-emerald-400 bg-emerald-950/80 border border-emerald-800/60 px-2 py-0.5 rounded-full flex items-center space-x-1">
                        <span>Upcoming</span>
                      </span>
                    )}
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* Modal Footer */}
        <div className="p-4 border-t border-slate-800 bg-slate-950/80 flex items-center justify-between text-xs text-slate-400">
          <span>Data synchronized with TVmaze</span>
          <button
            onClick={onClose}
            className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-xl font-semibold transition-colors"
          >
            Close Schedule
          </button>
        </div>
      </div>
    </div>
  );
}
