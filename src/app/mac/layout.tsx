import type { Metadata } from "next";
import "@mac/app/globals.css";

export const metadata: Metadata = {
  title: "つゆくさ Studio",
  description: "Mac preset editor for Tsuyukusa app",
};

export default function MacStudioLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="mac-studio-root min-h-screen antialiased" style={{ background: "#0f0f1a", color: "#e8e8f0" }}>
      {children}
    </div>
  );
}
