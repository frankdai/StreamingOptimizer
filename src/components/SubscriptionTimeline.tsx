"use client";

import React from "react";
import { OptimizationResult, Show, STREAMING_PLATFORMS } from "@/lib/types";
import { parseDate, diffInDays, formatDate } from "@/lib/optimizer";

interface SubscriptionTimelineProps {
  result: OptimizationResult;
  shows: Show[];
}

export function SubscriptionTimeline({ result, shows }: SubscriptionTimelineProps) {
  if (result.windows.length === 0) return null;

  // Determine timeline boundary dates
  let minDateStr = result.windows[0].startDate;
  let maxDateStr = result.windows[0].endDate;

  for (const win of result.windows) {
    if (win.startDate < minDateStr) minDateStr = win.startDate;
    if (win.endDate > maxDateStr) maxDateStr = win.endDate;
  }

  for (const s of shows) {
    for (const ep of s.episodes) {
      if (ep.airDate < minDateStr) minDateStr = ep.airDate;
      if (ep.airDate > maxDateStr) maxDateStr = ep.airDate;
    }
  }

  const totalDays = Math.max(30, diffInDays(minDateStr, maxDateStr));
  const minDate = parseDate(minDateStr);

  // Group windows by service for row display
  const services = Object.keys(result.byService);

  return (
    <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-6 shadow-xl space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
        <div>
          <h3 className="text-base font-bold text-slate-100">Interactive Subscription Timeline</h3>
          <p className="text-xs text-slate-400 mt-0.5">
            Visualize when each service is <span className="text-emerald-400 font-semibold">Active</span> vs{" "}
            <span className="text-slate-400 font-semibold">Paused ($0)</span>
          </p>
        </div>
        <div className="text-xs text-slate-400 bg-slate-950 px-3 py-1.5 rounded-lg border border-slate-800 flex-shrink-0">
          Range: <span className="text-slate-200 font-medium">{minDateStr}</span> &rarr;{" "}
          <span className="text-slate-200 font-medium">{maxDateStr}</span>
        </div>
      </div>

      {/* Gantt Timeline Container */}
      <div className="overflow-x-auto pb-2">
        <div className="min-w-[640px] space-y-5">
          {services.map((service) => {
            const serviceData = result.byService[service];
            const platform = STREAMING_PLATFORMS[service];
            const serviceShows = shows.filter((s) => s.streamingService === service);

            return (
              <div key={service} className="space-y-2">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-2">
                    <span
                      className="w-2.5 h-2.5 rounded-full"
                      style={{ backgroundColor: platform?.color || "#6366f1" }}
                    />
                    <span className="font-semibold text-sm text-slate-200">{service}</span>
                    <span className="text-xs text-slate-500">
                      ({serviceData.windows.length} billing cycle{serviceData.windows.length > 1 ? "s" : ""})
                    </span>
                  </div>
                  <span className="text-xs font-bold text-slate-300">
                    ${serviceData.totalCost.toFixed(2)} total
                  </span>
                </div>

                {/* Timeline track */}
                <div className="relative h-14 bg-slate-950/80 rounded-xl border border-slate-800/80 p-1.5">
                  {/* Episode release markers */}
                  {serviceShows.map((s) =>
                    s.episodes.map((ep) => {
                      const dayOffset = Math.max(0, diffInDays(minDateStr, ep.airDate));
                      const leftPercent = Math.min(100, Math.max(0, (dayOffset / totalDays) * 100));

                      return (
                        <div
                          key={`${s.id}-${ep.id}`}
                          title={`${s.title} S${ep.seasonNumber}E${ep.episodeNumber} (${ep.airDate})`}
                          className="absolute bottom-1 w-1.5 h-3.5 bg-slate-600 hover:bg-amber-400 hover:h-6 hover:scale-125 rounded-full transition-all cursor-pointer z-10 -translate-x-1/2"
                          style={{ left: `${leftPercent}%` }}
                        />
                      );
                    })
                  )}

                  {/* 30-Day Subscription Windows */}
                  {serviceData.windows.map((win, wIdx) => {
                    const startOffset = Math.max(0, diffInDays(minDateStr, win.startDate));
                    const windowDuration = diffInDays(win.startDate, win.endDate);
                    const leftPercent = Math.min(100, (startOffset / totalDays) * 100);
                    const widthPercent = Math.min(100 - leftPercent, (windowDuration / totalDays) * 100);

                    return (
                      <div
                        key={wIdx}
                        className="absolute top-1.5 bottom-1.5 rounded-lg border shadow-lg flex items-center px-2.5 overflow-hidden transition-all hover:brightness-110 cursor-pointer group"
                        style={{
                          left: `${leftPercent}%`,
                          width: `${Math.max(widthPercent, 4)}%`,
                          backgroundColor: `${platform?.color || "#4f46e5"}30`,
                          borderColor: platform?.color || "#6366f1",
                        }}
                      >
                        <div className="truncate text-xs font-semibold text-slate-100 flex items-center space-x-1.5">
                          <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse flex-shrink-0" />
                          <span className="truncate">
                            {win.coveredShowTitles.join(", ")} (${win.estimatedCost.toFixed(0)})
                          </span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Legend */}
      <div className="flex flex-wrap items-center gap-4 pt-2 border-t border-slate-800 text-xs text-slate-400">
        <div className="flex items-center space-x-2">
          <div className="w-4 h-3 rounded bg-indigo-600/40 border border-indigo-500" />
          <span>Active 30-Day Paid Window</span>
        </div>
        <div className="flex items-center space-x-2">
          <div className="w-1.5 h-3 bg-slate-500 rounded-full" />
          <span>Episode Release Drop</span>
        </div>
        <div className="flex items-center space-x-2">
          <div className="w-4 h-3 rounded bg-slate-950 border border-slate-800" />
          <span>Paused Subscription ($0)</span>
        </div>
      </div>
    </div>
  );
}
