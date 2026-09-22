"use client";

import React, { useState } from "react";
import { Trash2, Film, Radio, Layers, Calendar, ChevronRight } from "lucide-react";
import { Show, STREAMING_PLATFORMS, ViewingPreference } from "@/lib/types";
import { ShowScheduleModal } from "./ShowScheduleModal";

interface WatchlistManagerProps {
  shows: Show[];
  onTogglePreference: (showId: number | string, newPref: ViewingPreference) => void;
  onRemoveShow: (showId: number | string) => void;
}

export function WatchlistManager({
  shows,
  onTogglePreference,
  onRemoveShow,
}: WatchlistManagerProps) {
  const [selectedShow, setSelectedShow] = useState<Show | null>(null);

  if (shows.length === 0) {
    return (
      <div className="bg-slate-900/60 border border-dashed border-slate-800 rounded-2xl p-10 text-center">
        <Film className="w-12 h-12 text-slate-600 mx-auto mb-3" />
        <h3 className="text-lg font-semibold text-slate-300">Your Watchlist is Empty</h3>
        <p className="text-sm text-slate-500 mt-1 max-w-sm mx-auto">
          Search and add the shows you want to watch. We'll automatically calculate schedule overlaps and find the cheapest subscription path.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between px-1">
        <h3 className="text-sm font-semibold tracking-wider text-slate-400 uppercase">
          Tracked Shows ({shows.length})
        </h3>
        <span className="text-xs text-slate-500">Click any card to view episodic schedules</span>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
        {shows.map((show) => {
          const platform = STREAMING_PLATFORMS[show.streamingService];
          const hasEpisodes = show.episodes && show.episodes.length > 0;
          const sortedEps = hasEpisodes
            ? [...show.episodes].sort((a, b) => a.airDate.localeCompare(b.airDate))
            : [];
          const premiere = sortedEps[0]?.airDate;
          const finale = sortedEps[sortedEps.length - 1]?.airDate;

          return (
            <div
              key={show.id}
              className="group bg-slate-900/90 border border-slate-800 hover:border-indigo-500/50 hover:bg-slate-800/50 rounded-xl p-4 transition-all shadow-md flex flex-col justify-between"
            >
              {/* Card Click Area */}
              <div
                onClick={() => setSelectedShow(show)}
                className="cursor-pointer flex items-start justify-between space-x-3"
              >
                <div className="flex space-x-3 min-w-0">
                  {show.imageMedium ? (
                    <img
                      src={show.imageMedium}
                      alt={show.title}
                      className="w-12 h-16 object-cover rounded-lg flex-shrink-0 bg-slate-800 group-hover:brightness-110 transition-all shadow-sm"
                    />
                  ) : (
                    <div className="w-12 h-16 bg-slate-800 rounded-lg flex items-center justify-center flex-shrink-0 text-xs text-slate-500">
                      Poster
                    </div>
                  )}
                  <div className="min-w-0">
                    <div className="flex items-center space-x-1.5">
                      <h4 className="font-bold text-slate-100 text-sm truncate group-hover:text-indigo-300 transition-colors">
                        {show.title}
                      </h4>
                      <ChevronRight className="w-3.5 h-3.5 text-slate-500 opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0" />
                    </div>

                    <div className="flex items-center space-x-2 mt-1">
                      <span
                        className="text-xs px-2 py-0.5 rounded font-medium border"
                        style={{
                          backgroundColor: `${platform?.color || "#334155"}20`,
                          borderColor: `${platform?.color || "#475569"}60`,
                          color: platform?.color || "#94a3b8",
                        }}
                      >
                        {show.streamingService}
                      </span>
                      <span className="text-xs text-slate-400">
                        {hasEpisodes ? `${show.episodes.length} eps` : "Schedule loading..."}
                      </span>
                    </div>

                    {premiere && finale && (
                      <p className="text-[11px] text-slate-400 mt-1 flex items-center space-x-1">
                        <Calendar className="w-3 h-3 text-slate-500 flex-shrink-0" />
                        <span>
                          {premiere === finale ? `Airs: ${premiere}` : `${premiere} → ${finale}`}
                        </span>
                      </p>
                    )}
                  </div>
                </div>

                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    onRemoveShow(show.id);
                  }}
                  title="Remove show"
                  className="text-slate-500 hover:text-rose-400 p-1.5 rounded-lg hover:bg-rose-950/30 transition-colors"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>

              {/* Preference Switch (Clicks don't trigger modal) */}
              <div
                onClick={(e) => e.stopPropagation()}
                className="mt-4 pt-3 border-t border-slate-800/80 flex items-center justify-between"
              >
                <span className="text-xs font-medium text-slate-400">Viewing Preference:</span>
                <div className="inline-flex bg-slate-950 p-0.5 rounded-lg border border-slate-800">
                  <button
                    onClick={() => onTogglePreference(show.id, "LIVE")}
                    className={`px-2.5 py-1 text-xs rounded-md font-medium flex items-center space-x-1.5 transition-all ${
                      show.preference === "LIVE"
                        ? "bg-indigo-600 text-white shadow-sm"
                        : "text-slate-400 hover:text-slate-200"
                    }`}
                  >
                    <Radio className="w-3 h-3" />
                    <span>Live / Weekly</span>
                  </button>
                  <button
                    onClick={() => onTogglePreference(show.id, "BINGE_FINALE")}
                    className={`px-2.5 py-1 text-xs rounded-md font-medium flex items-center space-x-1.5 transition-all ${
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
            </div>
          );
        })}
      </div>

      {/* Episode Schedule Modal */}
      <ShowScheduleModal
        show={selectedShow}
        onClose={() => setSelectedShow(null)}
        onTogglePreference={onTogglePreference}
      />
    </div>
  );
}
