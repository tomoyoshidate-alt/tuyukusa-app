import type { Metadata } from "next";
import { Noto_Sans_JP, Noto_Serif_JP } from "next/font/google";
import RegisterTimerServiceWorker from "@/src/components/RegisterTimerServiceWorker";
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
  description: "和の暮らしに寄り添う、生活リズム診断アプリ",
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
        {children}
      </body>
    </html>
  );
}
