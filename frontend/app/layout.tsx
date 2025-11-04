// app/layout.tsx
import "./globals.css"; // ← this is the important bit
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "The Bower",
  description: "Donations & Collections",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      {/* add a class if you want (e.g. for Tailwind) */}
      <body>{children}</body>
    </html>
  );
}