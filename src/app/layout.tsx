import type { Metadata } from "next";
import { Geist } from "next/font/google";
import { PostHogProvider } from "@/components/PostHogProvider";
import "./globals.css";

const geist = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: {
    default: "Trustay — Choose your remote-work base with confidence",
    // City pages use: "Work, coffee & routine in Lisboa" → "Work, coffee & routine in Lisboa | Trustay"
    template: "%s | Trustay",
  },
  description:
    "Find a base area, places to work, coffee spots, and training options in any city — built for remote workers on the move.",
  openGraph: {
    type: "website",
    siteName: "Trustay",
  },
  twitter: {
    card: "summary",
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
