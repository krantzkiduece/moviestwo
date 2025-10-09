// src/app/profile/me/page.tsx
import TopFiveGallery from "../../../components/TopFiveGallery";
import WatchlistGallery from "../../../components/WatchlistGallery";
import RatedGallery from "../../../components/RatedGallery";
import PublishProfile from "../../../components/PublishProfile";

export default function MyProfilePage() {
  return (
    <div className="space-y-8">
      <section className="card">
        <h1 className="text-2xl font-bold">My Profile</h1>
        <p className="text-gray-400 text-sm mt-1">
          Your Top 5, Watchlist, and Ratings are saved in your browser.
        </p>
      </section>

      {/* Publish to a public profile under a Friend username */}
      <PublishProfile />

      <section className="card">
        <h2 className="text-xl font-semibold">Top 5</h2>
        <TopFiveGallery />
      </section>

      <section className="card">
        <h2 className="text-xl font-semibold">Watchlist</h2>
        <WatchlistGallery />
      </section>

      <section className="card">
        <h2 className="text-xl font-semibold">Rated</h2>
        <RatedGallery />
      </section>
    </div>
  );
}
