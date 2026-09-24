import localFont from "next/font/local";
import LandingPage from "@/components/LandingPage";

const vagly = localFont({
  src: "./fonts/VaglyDemoFont-Regular.otf",
  display: "swap",
  variable: "--font-vagly",
});

const bramonia = localFont({
  src: "./fonts/Bramonia-Regular.otf",
  display: "swap",
  variable: "--font-bramonia",
});

export default function Home() {
  return <LandingPage fontClassName={`${vagly.variable} ${bramonia.variable}`} />;
}
