import type { Metadata, Viewport } from "next";
import { Outfit } from "next/font/google";
import Nav from "@/components/Nav";
import Providers from "@/components/Providers";
import "./globals.css";

const outfit = Outfit({ variable: "--font-outfit", subsets: ["latin"] });

export const metadata: Metadata = {
  title: "Trailmarks — Every memory, remembered",
  description:
    "Claim every state you've visited, record trips that draw their own maps, and turn the photos into a story.",
};

export const viewport: Viewport = {
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#f2f5f6" },
    { media: "(prefers-color-scheme: dark)", color: "#0a1316" },
  ],
  viewportFit: "cover",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="en"
      className={`${outfit.variable} h-full antialiased`}
    >
      <body className="flex min-h-[100dvh] flex-col bg-bg text-ink">
        <Providers>
          <Nav />
          <main className="flex-1 pb-[calc(env(safe-area-inset-bottom)+6rem)] sm:pb-0">{children}</main>
        </Providers>
      </body>
    </html>
  );
}
