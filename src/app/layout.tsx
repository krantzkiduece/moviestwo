import "./globals.css";
import { cookies } from "next/headers";
import { Inter } from "next/font/google";
import { ReactNode } from "react";

const inter = Inter({ subsets: ["latin"] });

export const metadata = {
  title: "CineCircle",
  description: "MoviesTwo / CineCircle App",
};

export default function RootLayout({
  children,
}: {
  children: ReactNode;
}) {
  const cookieStore = cookies();
  const user = cookieStore.get("cc_user")?.value;

  return (
    <html lang="en">
      <body className={inter.className}>
        {!user ? (
          <div style={{ textAlign: "center", marginTop: "20vh" }}>
            <h2>🔒 CineCircle Login</h2>
            <form action="/api/login" method="post">
              <input
                type="text"
                name="username"
                placeholder="Enter admin username"
                style={{ padding: "8px", fontSize: "1em" }}
              />
              <button
                type="submit"
                style={{
                  padding: "8px 16px",
                  marginLeft: "8px",
                  fontSize: "1em",
                }}
              >
                Log In
              </button>
            </form>
          </div>
        ) : (
          children
        )}
      </body>
    </html>
  );
}
