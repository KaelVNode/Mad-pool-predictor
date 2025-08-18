// app/layout.jsx
import "./globals.css";

export const metadata = {
  metadataBase: new URL(process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000"),
  title: "Mad Pool Predictor — Open Build",
  description:
    "A fun price prediction mini-game built for Mad Scientists’ Open Build: Everything is an Experiment.",
  openGraph: {
    title: "Mad Pool Predictor — Open Build",
    description: "Everything is an Experiment. Guess ATOM/USD, climb the leaderboard.",
    url: process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000",
    siteName: "Mad Pool Predictor",
    images: [{ url: "/images/og.png", width: 1200, height: 630, alt: "Mad Pool Predictor" }],
    locale: "en_US",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    site: "@madscientists_x",
    creator: "@Kaelvin21",
  },
  icons: {
    icon: "/favicon.ico",
    shortcut: "/favicon.ico",
    apple: "/apple-touch-icon.png",
  },
};

export default function RootLayout({ children }) {
  return (
    <html lang="en" className="bg-black">
      <body className="min-h-dvh bg-black text-white antialiased">{children}</body>
    </html>
  );
}
