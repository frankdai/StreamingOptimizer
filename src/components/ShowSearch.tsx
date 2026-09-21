"use client";

import React, { useState, useEffect, useRef } from "react";
import { Search, Loader2, Plus, Check } from "lucide-react";
import { Show, STREAMING_PLATFORMS } from "@/lib/types";

interface ShowSearchProps {
  onAddShow: (show: Show) => Promise<void>;
  existingShowIds: (number | string)[];
}

export function ShowSearch({ onAddShow, existingShowIds }: ShowSearchProps) {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<Show[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isOpen, setIsOpen] = useState(false);
  const [addingId, setAddingId] = useState<number | null>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Close dropdown on outside click
  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // Debounced search
  useEffect(() => {
    if (!query.trim()) {
      setResults([]);
      setIsLoading(false);
      return;
    }

    const timer = setTimeout(async () => {
      setIsLoading(true);
      try {
        const res = await fetch(`/api/shows/search?q=${encodeURIComponent(query)}`);
        const data = await res.json();
        if (data.shows) {
          setResults(data.shows);
          setIsOpen(true);
        }
      } catch (err) {
        console.error("Search error:", err);
      } finally {
        setIsLoading(false);
      }
    }, 350);

    return () => clearTimeout(timer);
  }, [query]);

  const handleSelect = async (show: Show) => {
    if (existingShowIds.includes(show.id) || existingShowIds.includes(show.tvmazeId)) return;
    setAddingId(show.tvmazeId);
    try {
      await onAddShow(show);
      setIsOpen(false);
      setQuery("");
    } finally {
      setAddingId(null);
    }
  };

  return (
    <div className="relative w-full max-w-2xl" ref={dropdownRef}>
      <div className="relative">
        <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
        <input
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search TV shows (e.g. Severance, House of the Dragon, The Bear)..."
          className="w-full pl-12 pr-12 py-3.5 bg-slate-900/80 border border-slate-700/80 rounded-xl text-slate-100 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500/80 focus:border-transparent transition-all shadow-lg backdrop-blur"
          onFocus={() => {
            if (results.length > 0) setIsOpen(true);
          }}
        />
        {isLoading && (
          <Loader2 className="absolute right-4 top-1/2 -translate-y-1/2 w-5 h-5 text-indigo-400 animate-spin" />
        )}
      </div>

      {/* Dropdown Results */}
      {isOpen && results.length > 0 && (
        <div className="absolute z-50 left-0 right-0 mt-2 max-h-96 overflow-y-auto bg-slate-900 border border-slate-700 rounded-xl shadow-2xl divide-y divide-slate-800 backdrop-blur-lg">
          {results.map((show) => {
            const isAdded = existingShowIds.includes(show.id) || existingShowIds.includes(show.tvmazeId);
            const isBeingAdded = addingId === show.tvmazeId;
            const platform = STREAMING_PLATFORMS[show.streamingService];

            return (
              <div
                key={show.tvmazeId}
                className="flex items-center justify-between p-3.5 hover:bg-slate-800/80 transition-colors"
              >
                <div className="flex items-center space-x-3.5 min-w-0">
                  {show.imageMedium ? (
                    <img
                      src={show.imageMedium}
                      alt={show.title}
                      className="w-11 h-16 object-cover rounded-md flex-shrink-0 bg-slate-800"
                    />
                  ) : (
                    <div className="w-11 h-16 bg-slate-800 rounded-md flex items-center justify-center flex-shrink-0 text-xs text-slate-500 font-medium">
                      No Poster
                    </div>
                  )}
                  <div className="min-w-0">
                    <h4 className="font-semibold text-slate-100 text-sm truncate">{show.title}</h4>
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
                      <span className="text-xs text-slate-400 capitalize">{show.status}</span>
                    </div>
                  </div>
                </div>

                <button
                  onClick={() => handleSelect(show)}
                  disabled={isAdded || isBeingAdded}
                  className={`ml-4 px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center space-x-1 transition-all ${
                    isAdded
                      ? "bg-slate-800 text-slate-400 cursor-not-allowed"
                      : "bg-indigo-600 hover:bg-indigo-500 text-white shadow-md active:scale-95"
                  }`}
                >
                  {isBeingAdded ? (
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  ) : isAdded ? (
                    <>
                      <Check className="w-3.5 h-3.5" />
                      <span>Added</span>
                    </>
                  ) : (
                    <>
                      <Plus className="w-3.5 h-3.5" />
                      <span>Add to Plan</span>
                    </>
                  )}
                </button>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
