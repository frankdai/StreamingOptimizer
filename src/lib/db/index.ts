import { drizzle as drizzlePg } from "drizzle-orm/node-postgres";
import { drizzle as drizzleNeon } from "drizzle-orm/neon-serverless";
import { Pool } from "pg";
import { Pool as NeonPool } from "@neondatabase/serverless";
import * as schema from "./schema";
import * as dotenv from "dotenv";

dotenv.config({ path: ".env.local" });

const connectionString =
  process.env.DATABASE_URL || "postgresql://postgres:postgres@localhost:5433/stream_optimizer_dev";

const isNeon = connectionString.includes("neon.tech");

export const db = isNeon
  ? drizzleNeon(new NeonPool({ connectionString }), { schema })
  : drizzlePg(new Pool({ connectionString }), { schema });

export type Database = typeof db;
