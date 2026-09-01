import type { Metadata } from "next";
import { DM_Sans, Space_Mono } from "next/font/google";
import { Toaster } from "sonner";
import { publicEnv } from "@/shared/env.public";
import "./globals.css";

/**
 * Both faces were declared in the prototype's CSS but the auth pages never actually
 * loaded them, so login and signup rendered in Arial. next/font self-hosts them.
 */
const dmSans = DM_Sans({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700", "800"],
  variable: "--font-dm-sans",
  display: "swap",
});

const spaceMono = Space_Mono({
  subsets: ["latin"],
  weight: ["400", "700"],
  variable: "--font-space-mono",
  display: "swap",
});

export const metadata: Metadata = {
  metadataBase: new URL(publicEnv.siteUrl),
  title: {
    default: "Campus Loop — student marketplace",
    template: "%s · Campus Loop",
  },
  description:
    "Buy what you need, rent what you need temporarily, sell what you no longer use, and exchange useful things with students around campus.",
  openGraph: {
    title: "Campus Loop",
    description: "Your campus, in circulation. Buy • Rent • Sell • Exchange.",
    type: "website",
  },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`${dmSans.variable} ${spaceMono.variable}`}>
      <body>
        {children}
        <Toaster
          position="bottom-right"
          toastOptions={{
            style: {
              background: "var(--color-surface)",
              color: "var(--color-fg)",
              border: "1px solid var(--color-border)",
              borderRadius: "var(--radius-md)",
              fontFamily: "var(--font-display)",
            },
          }}
        />
      </body>
    </html>
  );
}
