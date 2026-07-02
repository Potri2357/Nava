import type { Metadata } from "next";
import "./globals.css";
import { Providers } from "./providers";

export const metadata: Metadata = {
  title: "Nava AI Recruiter",
  description: "Explainable candidate ranking with semantic matching, trajectory scoring, and recruiter controls.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="font-sans">
      <body className="antialiased">
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
