import type { Metadata, Viewport } from "next";
import { Noto_Sans_JP, Noto_Serif_JP } from "next/font/google";
import RadioProvider from "@/src/components/RadioProvider";
import RegisterTimerServiceWorker from "@/src/components/RegisterTimerServiceWorker";
import AppProviders from "@/src/components/AppProviders";
import "./globals.css";

export const dynamic = "force-dynamic";
export const revalidate = 0;

const notoSans = Noto_Sans_JP({
  variable: "--font-noto-sans",
  subsets: ["latin"],
  weight: ["400", "500", "700"],
});

const notoSerif = Noto_Serif_JP({
  variable: "--font-noto-serif",
  subsets: ["latin"],
  weight: ["500", "700"],
});

export const metadata: Metadata = {
  title: "つゆくさ生活リズム",
  description: "24時間、つゆくさAIが漢方・養生の知恵で生活リズムを整えるアプリ",
  manifest: "/manifest.json",
  appleWebApp: {
    capable: true,
    statusBarStyle: "default",
    title: "つゆくさ",
  },
  icons: {
    icon: "/icons/icon-192.svg",
    apple: "/icons/icon-512.svg",
  },
};

export const viewport: Viewport = {
  themeColor: "#1a1410",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="ja"
      className={`${notoSans.variable} ${notoSerif.variable} h-full antialiased`}
    >
      <body className="min-h-full">
        <RegisterTimerServiceWorker />
        <AppProviders>
          <RadioProvider>{children}</RadioProvider>
        </AppProviders>
      </body>
    </html>
  );
}
