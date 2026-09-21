import {
  date,
  integer,
  numeric,
  pgEnum,
  pgTable,
  text,
  timestamp,
  uniqueIndex,
  uuid,
} from "drizzle-orm/pg-core";

// Enums
export const viewingPreferenceEnum = pgEnum("viewing_preference", ["LIVE", "BINGE_FINALE"]);
export const windowStatusEnum = pgEnum("window_status", ["UPCOMING", "ACTIVE", "COMPLETED", "SUPERSEDED"]);

// Users table
export const users = pgTable("users", {
  id: uuid("id").defaultRandom().primaryKey(),
  email: text("email").notNull().unique(),
  name: text("name"),
  lastLoginAt: timestamp("last_login_at", { withTimezone: true }),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
});

// Shows cached metadata
export const shows = pgTable(
  "shows",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    tvmazeId: integer("tvmaze_id").notNull().unique(),
    title: text("title").notNull(),
    streamingService: text("streaming_service").notNull(),
    status: text("status").notNull(),
    summary: text("summary"),
    imageMedium: text("image_medium"),
    imageOriginal: text("image_original"),
    lastSyncedAt: timestamp("last_synced_at", { withTimezone: true }).defaultNow().notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => [uniqueIndex("idx_shows_tvmaze_id").on(table.tvmazeId)]
);

// Episodes air dates table
export const episodes = pgTable("episodes", {
  id: uuid("id").defaultRandom().primaryKey(),
  showId: uuid("show_id")
    .references(() => shows.id, { onDelete: "cascade" })
    .notNull(),
  tvmazeEpisodeId: integer("tvmaze_episode_id"),
  seasonNumber: integer("season_number").notNull(),
  episodeNumber: integer("episode_number").notNull(),
  title: text("title"),
  airDate: date("air_date").notNull(),
  airTime: text("air_time"),
  runtime: integer("runtime"),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
});

// User Watchlist with preference
export const userWatchlist = pgTable(
  "user_watchlist",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    userId: uuid("user_id")
      .references(() => users.id, { onDelete: "cascade" })
      .notNull(),
    showId: uuid("show_id")
      .references(() => shows.id, { onDelete: "cascade" })
      .notNull(),
    preference: viewingPreferenceEnum("preference").default("LIVE").notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => [uniqueIndex("idx_user_show_unique").on(table.userId, table.showId)]
);

// Computed 30-Day Subscription Plans / Windows
export const subscriptionPlans = pgTable("subscription_plans", {
  id: uuid("id").defaultRandom().primaryKey(),
  userId: uuid("user_id")
    .references(() => users.id, { onDelete: "cascade" })
    .notNull(),
  streamingService: text("streaming_service").notNull(),
  startDate: date("start_date").notNull(),
  endDate: date("end_date").notNull(), // startDate + 30 days
  status: windowStatusEnum("status").default("UPCOMING").notNull(),
  estimatedCost: numeric("estimated_cost", { precision: 6, scale: 2 }).notNull(),
  coveredShowIds: text("covered_show_ids").array().notNull(),
  notes: text("notes"),

  // Notification audit flags for idempotency
  startEmailSentAt: timestamp("start_email_sent_at", { withTimezone: true }),
  cancelEmailSentAt: timestamp("cancel_email_sent_at", { withTimezone: true }),

  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
});
