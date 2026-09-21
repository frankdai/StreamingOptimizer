import { Episode, Show, ViewingPreference } from "./types";

interface TVmazeNetwork {
  id: number;
  name: string;
  country?: { name: string; code: string; timezone: string } | null;
}

export interface TVmazeRawShow {
  id: number;
  name: string;
  type: string;
  language: string;
  genres: string[];
  status: string;
  premiered?: string;
  ended?: string;
  webChannel?: TVmazeNetwork | null;
  network?: TVmazeNetwork | null;
  image?: {
    medium?: string;
    original?: string;
  } | null;
  summary?: string;
}

export interface TVmazeRawEpisode {
  id: number;
  name: string;
  season: number;
  number: number;
  airdate: string;
  airtime: string;
  runtime: number;
  summary?: string;
}

const BASE_URL = "https://api.tvmaze.com";

/**
 * Resolves the primary streaming platform for a show.
 * Prioritizes webChannel (streaming native) and falls back to mapping traditional US broadcast networks.
 */
export function resolveStreamingPlatform(show: TVmazeRawShow): string {
  if (show.webChannel?.name) {
    const raw = show.webChannel.name.trim();
    if (raw.toLowerCase().includes("netflix")) return "Netflix";
    if (raw.toLowerCase().includes("apple")) return "Apple TV+";
    if (raw.toLowerCase().includes("disney")) return "Disney+";
    if (raw.toLowerCase().includes("max") || raw.toLowerCase().includes("hbo max")) return "Max";
    if (raw.toLowerCase().includes("hulu")) return "Hulu";
    if (raw.toLowerCase().includes("amazon") || raw.toLowerCase().includes("prime video")) return "Amazon Prime Video";
    if (raw.toLowerCase().includes("paramount")) return "Paramount+";
    if (raw.toLowerCase().includes("peacock")) return "Peacock";
    return raw;
  }

  // Map traditional parent broadcast networks to their US streaming homes
  if (show.network?.name) {
    const net = show.network.name.trim();
    const networkMap: Record<string, string> = {
      "HBO": "Max",
      "FX": "Hulu",
      "FXX": "Hulu",
      "Showtime": "Paramount+",
      "CBS": "Paramount+",
      "NBC": "Peacock",
      "ABC": "Hulu",
      "PBS": "PBS Passport",
      "AMC": "AMC+",
      "BBC America": "AMC+",
    };

    if (networkMap[net]) {
      return networkMap[net];
    }
    return net;
  }

  return "Other / Unknown";
}

/**
 * Search for TV shows by title
 */
export async function searchTVmazeShows(query: string): Promise<Show[]> {
  if (!query || query.trim().length === 0) return [];

  const response = await fetch(`${BASE_URL}/search/shows?q=${encodeURIComponent(query.trim())}`);
  if (!response.ok) {
    throw new Error(`TVmaze search failed: ${response.statusText}`);
  }

  const results = (await response.json()) as Array<{ show: TVmazeRawShow }>;

  return results.map(({ show }) => ({
    id: show.id,
    tvmazeId: show.id,
    title: show.name,
    streamingService: resolveStreamingPlatform(show),
    status: show.status,
    summary: show.summary ? show.summary.replace(/<[^>]*>?/gm, "") : "",
    imageMedium: show.image?.medium,
    imageOriginal: show.image?.original,
    episodes: [],
    preference: "LIVE" as ViewingPreference,
  }));
}

/**
 * Fetch all episodes with air dates for a show
 */
export async function getShowEpisodes(tvmazeId: number): Promise<Episode[]> {
  const response = await fetch(`${BASE_URL}/shows/${tvmazeId}/episodes`);
  if (!response.ok) {
    throw new Error(`TVmaze fetch episodes failed for show ${tvmazeId}: ${response.statusText}`);
  }

  const rawEpisodes = (await response.json()) as TVmazeRawEpisode[];

  return rawEpisodes
    .filter((ep) => ep.airdate && ep.airdate.trim() !== "")
    .map((ep) => ({
      id: ep.id,
      showId: tvmazeId,
      seasonNumber: ep.season,
      episodeNumber: ep.number,
      name: ep.name,
      airDate: ep.airdate,
      airTime: ep.airtime,
      runtime: ep.runtime,
    }));
}

/**
 * Query the TVmaze updates endpoint for daily incremental sync
 * returns a map of showId -> last_updated_epoch_seconds
 */
export async function getTVmazeUpdatedShows(since: "day" | "week" = "day"): Promise<Record<string, number>> {
  const response = await fetch(`${BASE_URL}/updates/shows?since=${since}`);
  if (!response.ok) {
    throw new Error(`TVmaze updates failed: ${response.statusText}`);
  }
  return response.json();
}
