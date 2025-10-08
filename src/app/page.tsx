export default function HomePage() {
  return (
    <div className="card">
      <h1 className="text-2xl font-bold">🎬 CineCircle</h1>
      <p className="text-gray-300 mt-2">Welcome! Use the navigation to explore.</p>
      <ul className="list-disc ml-6 mt-4 text-gray-300">
        <li>Trending shows recent community activity</li>
        <li>Search lets you look up movies by title, year, genre, or cast</li>
        <li>Friends lists all users (placeholder)</li>
        <li>Profile page is a placeholder for now</li>
      </ul>
    </div>
  );
}
