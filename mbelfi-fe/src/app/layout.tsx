import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { Providers } from "./providers";
import GlowingGridBackground from "@/components/glowing-grid-background";
import { NavbarNeon } from "@/components/navbar";
import { Toaster } from "sonner";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "MbelFi",
  description: "Permsissionless Lending Protocol",
  icons: {
    icon: "/mbelbluelogo.png",
    shortcut: "/mbelbluelogo.png",
    apple: "/mbelbluelogo.png",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased`}
      >
        <Providers>
          <GlowingGridBackground />
          <Toaster />
          <div className="mx-2">
            <NavbarNeon />

            <div className="relative flex flex-col h-screen">
              <main className="container mx-auto max-w-7xl pt-8 flex-grow">
                {children}
              </main>
            </div>
          </div>
        </Providers>
      </body>
    </html>
  );
}
