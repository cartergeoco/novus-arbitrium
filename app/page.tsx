import localFont from "next/font/local";
import LandingPage from "@/components/LandingPage";

const vagly = localFont({
  src: "./fonts/VaglyDemoFont-Regular.otf",
  display: "swap",
  variable: "--font-wordmark",
});

const bramonia = localFont({
  src: "./fonts/Bramonia-Regular.otf",
  display: "swap",
  variable: "--font-bramonia",
});

export default function Home() {
  return (
    <LandingPage
      wordmarkFontClassName={vagly.variable}
      greetingFontClassName={bramonia.variable}
    />
  );
}
