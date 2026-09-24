import type { Metadata } from "next";
import "@fontsource/poppins/400.css";
import "@fontsource/poppins/500.css";
import "@fontsource/poppins/600.css";
import "@fontsource/ibm-plex-mono/400.css";
import "leaflet/dist/leaflet.css";
import "@geoman-io/leaflet-geoman-free/dist/leaflet-geoman.css";
import "flag-icons/css/flag-icons.min.css";
import "./globals.css";
import "./polish.css";

export const metadata: Metadata = {
  title: "Novus Arbitrium",
  description: "Lead a nation through an unwritten history. A playable alternate-history strategy alpha with editable borders and an AI world engine.",
  other: {
    "codex-preview": "development",
  },
  icons: {
    icon: "/novus-logo.svg",
    shortcut: "/novus-logo.svg",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className="antialiased">{children}</body>
    </html>
  );
}
