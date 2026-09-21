"use client";

import React from "react";
import { TrendingDown, ShieldCheck, DollarSign, Calendar, AlertCircle } from "lucide-react";
import { OptimizationResult, STREAMING_PLATFORMS } from "@/lib/types";

interface SavingsSummaryProps {
  result: OptimizationResult;
}

export function SavingsSummary({ result }: SavingsSummaryProps) {
  if (result.windows.length === 0) return null;

  return (
    <div className="space-y-6">
      {/* High-level Metric Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {/* Optimized Cost */}
        <div className="bg-slate-900/90 border border-slate-800 rounded-xl p-4 shadow-lg">
          <div className="flex items-center justify-between text-slate-400 text-xs font-semibold uppercase">
            <span>Optimized Cost</span>
            <DollarSign className="w-4 h-4 text-emerald-400" />
          </div>
          <div className="mt-2 flex items-baseline space-x-1">
            <span className="text-2xl font-black text-slate-100">${result.totalOptimizedCost}</span>
            <span className="text-xs text-slate-400">total</span>
          </div>
          <p className="text-[11px] text-emerald-400 mt-1">Pay only when watching</p>
        </div>

        {/* Always-Subscribed Cost */}
        <div className="bg-slate-900/90 border border-slate-800 rounded-xl p-4 shadow-lg">
          <div className="flex items-center justify-between text-slate-400 text-xs font-semibold uppercase">
            <span>Always Subscribed</span>
            <Calendar className="w-4 h-4 text-slate-500" />
          </div>
          <div className="mt-2 flex items-baseline space-x-1">
            <span className="text-2xl font-bold text-slate-400 line-through">
              ${result.alwaysSubscribedCost}
            </span>
            <span className="text-xs text-slate-500">unoptimized</span>
          </div>
          <p className="text-[11px] text-slate-500 mt-1">Default auto-renew cost</p>
        </div>

        {/* You Save */}
        <div className="bg-gradient-to-br from-indigo-950/80 to-slate-900 border border-indigo-500/30 rounded-xl p-4 shadow-lg">
          <div className="flex items-center justify-between text-indigo-300 text-xs font-semibold uppercase">
            <span>Total Savings</span>
            <TrendingDown className="w-4 h-4 text-indigo-400" />
          </div>
          <div className="mt-2 flex items-baseline space-x-2">
            <span className="text-2xl font-black text-indigo-200">${result.totalSaved}</span>
            <span className="text-xs font-bold text-emerald-400 bg-emerald-950/80 px-2 py-0.5 rounded-full border border-emerald-800/60">
              {result.savingsPercentage}% OFF
            </span>
          </div>
          <p className="text-[11px] text-indigo-300/80 mt-1">Kept in your wallet</p>
        </div>

        {/* Billed Months */}
        <div className="bg-slate-900/90 border border-slate-800 rounded-xl p-4 shadow-lg">
          <div className="flex items-center justify-between text-slate-400 text-xs font-semibold uppercase">
            <span>Paid Cycles</span>
            <ShieldCheck className="w-4 h-4 text-sky-400" />
          </div>
          <div className="mt-2 flex items-baseline space-x-1">
            <span className="text-2xl font-black text-slate-100">{result.activeServiceMonths}</span>
            <span className="text-xs text-slate-400">30-day blocks</span>
          </div>
          <p className="text-[11px] text-sky-400 mt-1">Non-prorated months needed</p>
        </div>
      </div>

      {/* Action Plan & Churn Strategy */}
      <div className="bg-slate-900/80 border border-slate-800 rounded-xl p-5 shadow-lg">
        <h4 className="text-sm font-bold text-slate-200 flex items-center space-x-2">
          <span>📋 Your Step-by-Step Churn Action Plan</span>
        </h4>
        <p className="text-xs text-slate-400 mt-1">
          Follow these dates to unlock maximum entertainment with minimum subscriptions.
        </p>

        <div className="mt-4 space-y-2.5">
          {result.windows.map((window, idx) => {
            const platform = STREAMING_PLATFORMS[window.streamingService];
            return (
              <div
                key={idx}
                className="flex flex-col sm:flex-row sm:items-center justify-between p-3 rounded-lg bg-slate-950/70 border border-slate-800/80 space-y-2 sm:space-y-0"
              >
                <div className="flex items-start sm:items-center space-x-3">
                  <div
                    className="w-7 h-7 rounded-lg flex items-center justify-center font-bold text-xs flex-shrink-0"
                    style={{
                      backgroundColor: `${platform?.color || "#4f46e5"}25`,
                      color: platform?.color || "#818cf8",
                      border: `1px solid ${platform?.color || "#4f46e5"}50`,
                    }}
                  >
                    {platform?.logoBadge || window.streamingService[0]}
                  </div>
                  <div>
                    <div className="flex items-center space-x-2">
                      <span className="font-semibold text-slate-100 text-sm">
                        {window.streamingService}
                      </span>
                      <span className="text-xs text-slate-400">
                        ({window.startDate} &rarr; {window.endDate})
                      </span>
                    </div>
                    <p className="text-xs text-slate-400 mt-0.5">
                      Watching: <span className="text-slate-200 font-medium">{window.coveredShowTitles.join(", ")}</span>
                    </p>
                  </div>
                </div>

                <div className="text-left sm:text-right flex-shrink-0">
                  <div className="text-xs font-bold text-emerald-400">
                    ${window.estimatedCost.toFixed(2)}
                  </div>
                  <span className="text-[11px] text-slate-400">
                    Cancel auto-renew on Day 1
                  </span>
                </div>
              </div>
            );
          })}
        </div>

        {/* Pro Tip Box */}
        <div className="mt-4 p-3.5 bg-amber-950/30 border border-amber-800/40 rounded-lg flex items-start space-x-3 text-xs text-amber-200/90">
          <AlertCircle className="w-4 h-4 text-amber-400 flex-shrink-0 mt-0.5" />
          <div>
            <strong>Why "Cancel Auto-Renewal Immediately" Works:</strong>
            <p className="mt-0.5 text-amber-300/80">
              Streaming services do not give partial refunds, but by law and policy they must honor the remaining days of your prepaid 30-day block. Subscribing and instantly disabling auto-renewal guarantees you never forget to cancel and never get billed for an idle month.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
