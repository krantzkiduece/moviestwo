// src/app/profile/me/page.tsx
import TopFiveGallery from "../../../components/TopFiveGallery";
import WatchlistGallery from "../../../components/WatchlistGallery";

export default function MyProfilePage() {
  return (
    <div className="space-y-6">
      <section className="card">
        <h2 className="text-xl font-semibold">My Top 5</h2>
        <p className="text-gray-400 text-sm mb-3">
          Add movies to your Top 5 from any movie page.
        </p>
        <TopFiveGallery />
      </section>

      <section className="card">
        <h2 className="text-xl font-semibold">Watchlist</h2>
        <p className="text-gray-400 text-sm mb-3">
          Add a movie to your Watchlist on its movie page. Rating a movie will automatically remove it from the Watchlist.
        </p>
        <WatchlistGallery />
      </section>

      <section className="card">
        <h2 className="text-xl font-semibold">Rated</h2>
        <p className="text-gray-400">Coming soon.</p>
      </section>
    </div>
  );
}
