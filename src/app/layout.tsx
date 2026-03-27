import type { Metadata } from "next";
import { Geist } from "next/font/google";
import { PostHogProvider } from "@/components/PostHogProvider";
import "./globals.css";

const geist = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const APP_URL = "https://truststay.co";
const OG_IMAGE = `${APP_URL}/og.png`;

export const metadata: Metadata = {
  title: {
    default: "Truststay — Land in a new spot. Keep your routine from day one.",
    template: "%s | Truststay",
  },
  description:
    "Find the best neighborhood to base yourself in any city — work spots, cafes, and gyms organized around a walkable daily routine. Built for remote workers.",
  metadataBase: new URL(APP_URL),
  openGraph: {
    type: "website",
    siteName: "Truststay",
    title: "Truststay — Land in a new spot. Keep your routine from day one.",
    description:
      "Find the best neighborhood to base yourself in any city — work spots, cafes, and gyms organized around a walkable daily routine.",
    url: APP_URL,
    images: [
      {
        url: OG_IMAGE,
        width: 1200,
        height: 630,
        alt: "Truststay — map with work, coffee, and wellbeing pins",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "Truststay — Land in a new spot. Keep your routine from day one.",
    description:
      "Find the best neighborhood to base yourself in any city — work spots, cafes, and gyms organized around a walkable daily routine.",
    images: [OG_IMAGE],
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className={`${geist.variable} h-full antialiased`}>
      <body className="min-h-full flex flex-col bg-cream text-bark">
        <PostHogProvider>{children}</PostHogProvider>
      </body>
    </html>
  );
}
