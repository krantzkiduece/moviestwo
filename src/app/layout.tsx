import "../styles/globals.css";
import NavBar from "../components/NavBar";

export const metadata = { title: "CineCircle" };

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>
        <NavBar />
        <main className="container py-6">{children}</main>
        <footer className="container py-10 text-xs text-gray-400">
          Movie data and images provided by <a href="https://www.themoviedb.org" target="_blank" rel="noreferrer">The Movie Database (TMDb)</a>.
        </footer>
      </body>
    </html>
  );
}
