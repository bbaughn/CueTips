import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import localFont from "next/font/local";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

const myriadPro = localFont({
  src: "../fonts/MyriadPro-Semibold.otf",
  variable: "--font-disc",
  weight: "600",
});

export const metadata: Metadata = {
  title: "CueTips",
  description: "Vinyl DJ collection manager",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body
        className={`${geistSans.variable} ${geistMono.variable} ${myriadPro.variable} antialiased`}
      >
        {children}
      </body>
    </html>
  );
}
