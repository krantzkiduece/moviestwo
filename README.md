# CineCircle (Starter)
A minimal Next.js (App Router) starter with Tailwind and TMDb proxy routes.

## Quick Start (Replit)
1. Create a new Replit → **Create** → **Upload from computer** → upload this zip.
2. Open **Secrets/Environment** in Replit and add:
   - `TMDB_API_KEY` → your TMDb key
3. Open the Shell and run:
   ```bash
   npm install
   npm run dev
   ```
4. Click the web preview — you should see the app running.
   - Home, Trending, Friends, Profile are placeholders.
   - **Search** works: try searching for "Inception".

## What’s included
- Next.js 14 (App Router), TypeScript
- Tailwind CSS
- API routes that proxy to TMDb:
  - `GET /api/tmdb/search?q=...`
  - `GET /api/tmdb/movie/:id`

## Next steps (when ready)
- Add auth and DB (Prisma + SQLite) for users, ratings, watchlist, comments.
- Build pages for Movie Detail, Rated, Watchlist, Top 5, Admin.
- Implement infinite scroll components and star ratings.
