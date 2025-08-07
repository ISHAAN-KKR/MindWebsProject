import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Mind Webs Ventures Dashboard",
  description: "Interactive dashboard for spatial and temporal data visualization",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className="antialiased">
        {children}
      </body>
    </html>
  );
}