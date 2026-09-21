export type ViewingPreference = "LIVE" | "BINGE_FINALE";

export type WindowStatus = "UPCOMING" | "ACTIVE" | "COMPLETED" | "SUPERSEDED";

export interface StreamingPlatformInfo {
  name: string;
  color: string;
  monthlyCost: number; // in USD
  logoBadge: string;
}

export const STREAMING_PLATFORMS: Record<string, StreamingPlatformInfo> = {
  "Netflix": { name: "Netflix", color: "#E50914", monthlyCost: 15.49, logoBadge: "N" },
  "Apple TV+": { name: "Apple TV+", color: "#000000", monthlyCost: 9.99, logoBadge: "TV+" },
  "Max": { name: "Max", color: "#002BE7", monthlyCost: 16.99, logoBadge: "MAX" },
  "Disney+": { name: "Disney+", color: "#113CCF", monthlyCost: 13.99, logoBadge: "D+" },
  "Hulu": { name: "Hulu", color: "#1CE783", monthlyCost: 9.99, logoBadge: "hulu" },
  "Amazon Prime Video": { name: "Amazon Prime Video", color: "#00A8E1", monthlyCost: 8.99, logoBadge: "prime" },
  "Paramount+": { name: "Paramount+", color: "#0064FF", monthlyCost: 7.99, logoBadge: "P+" },
  "Peacock": { name: "Peacock", color: "#000000", monthlyCost: 7.99, logoBadge: "Pck" },
};

export const DEFAULT_PLATFORM_COST = 9.99;

export interface Episode {
  id: number | string;
  showId: number | string;
  seasonNumber: number;
  episodeNumber: number;
  name?: string;
  airDate: string; // YYYY-MM-DD
  airTime?: string;
  runtime?: number;
}

export interface Show {
  id: number | string;
  tvmazeId: number;
  title: string;
  streamingService: string;
  status: string; // "Running" | "Ended" | etc.
  summary?: string;
  imageMedium?: string;
  imageOriginal?: string;
  episodes: Episode[];
  preference: ViewingPreference;
}

export interface SubscriptionWindow {
  id?: string;
  streamingService: string;
  startDate: string; // YYYY-MM-DD
  endDate: string;   // YYYY-MM-DD (startDate + 30 days)
  status: WindowStatus;
  estimatedCost: number;
  coveredShowIds: (number | string)[];
  coveredShowTitles: string[];
  notes?: string;
}

export interface OptimizationResult {
  windows: SubscriptionWindow[];
  totalOptimizedCost: number;
  alwaysSubscribedCost: number;
  totalSaved: number;
  savingsPercentage: number;
  activeServiceMonths: number;
  byService: Record<
    string,
    {
      service: string;
      windows: SubscriptionWindow[];
      totalCost: number;
      showCount: number;
    }
  >;
}
