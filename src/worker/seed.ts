import { db } from "../lib/db";
import { users, shows, userWatchlist } from "../lib/db/schema";
import { eq } from "drizzle-orm";

export async function seed() {
  console.log("Seeding test user and watchlist into local database...");

  // 1. Create or get test user
  let user = (await db.select().from(users).where(eq(users.email, "frank@example.com")))[0];
  if (!user) {
    const [newUser] = await db
      .insert(users)
      .values({
        email: "frank@example.com",
        name: "Frank",
      })
      .returning();
    user = newUser;
    console.log(`Created user: ${user.name} (${user.email})`);
  } else {
    console.log(`User already exists: ${user.name} (${user.email})`);
  }

  // 2. Insert Severance (Apple TV+)
  let severance = (await db.select().from(shows).where(eq(shows.tvmazeId, 44458)))[0];
  if (!severance) {
    const [newShow] = await db
      .insert(shows)
      .values({
        tvmazeId: 44458,
        title: "Severance",
        streamingService: "Apple TV+",
        status: "Running",
        imageMedium: "https://static.tvmaze.com/uploads/images/medium_portrait/499/1247926.jpg",
      })
      .returning();
    severance = newShow;
    console.log(`Created show: ${severance.title}`);
  }

  // 3. Insert The Penguin (Max)
  let penguin = (await db.select().from(shows).where(eq(shows.tvmazeId, 57530)))[0];
  if (!penguin) {
    const [newShow] = await db
      .insert(shows)
      .values({
        tvmazeId: 57530,
        title: "The Penguin",
        streamingService: "Max",
        status: "Ended",
        imageMedium: "https://static.tvmaze.com/uploads/images/medium_portrait/529/1324317.jpg",
      })
      .returning();
    penguin = newShow;
    console.log(`Created show: ${penguin.title}`);
  }

  // 4. Add to user watchlist
  const existingSeveranceWatch = (
    await db
      .select()
      .from(userWatchlist)
      .where(eq(userWatchlist.showId, severance.id))
  )[0];

  if (!existingSeveranceWatch) {
    await db.insert(userWatchlist).values({
      userId: user.id,
      showId: severance.id,
      preference: "LIVE",
    });
    console.log("Added Severance to watchlist (LIVE)");
  }

  const existingPenguinWatch = (
    await db
      .select()
      .from(userWatchlist)
      .where(eq(userWatchlist.showId, penguin.id))
  )[0];

  if (!existingPenguinWatch) {
    await db.insert(userWatchlist).values({
      userId: user.id,
      showId: penguin.id,
      preference: "BINGE_FINALE",
    });
    console.log("Added The Penguin to watchlist (BINGE_FINALE)");
  }

  console.log("Seed completed! You can now run `npm run worker:run` to test sync and alerts.");
}

seed()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error(err);
    process.exit(1);
  });
