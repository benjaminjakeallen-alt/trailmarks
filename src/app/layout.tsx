import type { Metadata, Viewport } from "next";
import { Outfit } from "next/font/google";
import Nav from "@/components/Nav";
import FamilyProvider from "@/components/family/FamilyProvider";
import { getViewer } from "@/lib/auth";
import { getFamily } from "@/lib/family";
import Providers from "@/components/Providers";
import { cookies } from "next/headers";
import { THEME_COLORS, THEME_COOKIE, themeFrom } from "@/lib/theme";
import "./globals.css";

const outfit = Outfit({ variable: "--font-outfit", subsets: ["latin"] });

export const metadata: Metadata = {
  title: "Trailmarks — Every memory, remembered",
  description:
    "Claim every state you've visited, record trips that draw their own maps, and turn the photos into a story.",
};

export async function generateViewport(): Promise<Viewport> {
  const theme = themeFrom((await cookies()).get(THEME_COOKIE)?.value);
  return { themeColor: THEME_COLORS[theme], colorScheme: theme, viewportFit: "cover" };
}

export default async function RootLayout({ children }: LayoutProps<"/">) {
  const viewer = await getViewer();
  const family = viewer ? await getFamily(viewer.familyId) : null;
  const theme = themeFrom((await cookies()).get(THEME_COOKIE)?.value);

  return (
    <html
      lang="en"
      data-theme={theme}
      className={`${outfit.variable} h-full antialiased`}
    >
      <body className="flex min-h-[100dvh] flex-col bg-canvas text-fg">
        <Providers>
          <FamilyProvider
            viewer={viewer}
            members={family?.members ?? []}
            family={family ? { name: family.name, inviteCode: family.inviteCode } : null}
          >
            <Nav />
            <main className={`flex-1 ${viewer ? "pb-[calc(env(safe-area-inset-bottom)+6rem)] sm:pb-0" : ""}`}>
              {children}
            </main>
          </FamilyProvider>
        </Providers>
      </body>
    </html>
  );
}
