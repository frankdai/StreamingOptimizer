# Stream Optimizer

An intelligent streaming subscription schedule optimizer. Track ongoing TV shows across major streaming services (Netflix, Apple TV+, Max, Disney+, Hulu, Amazon Prime), compute schedule overlaps, and minimize subscription costs with 30-day non-prorated billing cycles.

## Features
- **Smart 30-Day Window Solver:** Minimizes paid billing cycles while ensuring you never miss a show.
- **Per-Show Preference:** Toggle between "Follow Along (Weekly / Live)" and "Wait for Season Finale (Binge)".
- **Free-Rider Piggybacking:** Automatically detects when binge-ready shows can be watched for $0 during existing active subscription windows.
- **Daily Async Compute & Alerts:** Daily background recalculation with automated email alerts when to subscribe and when to cancel.

## Tech Stack
- **Language:** TypeScript
- **Database:** Neon (Serverless PostgreSQL)
- **Compute:** Vercel / Railway
