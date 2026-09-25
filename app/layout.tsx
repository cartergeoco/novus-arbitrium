import type { Metadata } from "next";
import { headers } from "next/headers";
import { Analytics } from "@vercel/analytics/next";
import { SpeedInsights } from "@vercel/speed-insights/next";
import "@fontsource/poppins/400.css";
import "@fontsource/poppins/500.css";
import "@fontsource/poppins/600.css";
import "@fontsource/ibm-plex-mono/400.css";
import "leaflet/dist/leaflet.css";
import "@geoman-io/leaflet-geoman-free/dist/leaflet-geoman.css";
import "flag-icons/css/flag-icons.min.css";
import "./globals.css";
import "./polish.css";
import "./flag-creator.css";

export const metadata: Metadata = {
  title: "Novus Arbitrium",
  description: "Lead a nation through an unwritten history. A playable alternate-history strategy alpha with editable borders and an AI world engine.",
  icons: {
    icon: [{ url: "/favicon.svg?v=white", type: "image/svg+xml" }],
    shortcut: [{ url: "/favicon.svg?v=white", type: "image/svg+xml" }],
  },
};

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  // Read the request so production can stamp the CSP nonce onto the hydration scripts.
  await headers();
  return (
    <html lang="en">
      <body className="antialiased">
        {children}
        <Analytics />
        <SpeedInsights />
      </body>
    </html>
  );
}
