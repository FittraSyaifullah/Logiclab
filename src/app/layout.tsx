import type { Metadata } from "next";
import localFont from "next/font/local";
import "./globals.css";
import { AuthProvider } from "@/contexts/AuthContext";

const arialSans = localFont({
  src: [
    {
      path: "../../public/fonts/arial.ttf",
      weight: "400",
      style: "normal",
    },
  ],
  variable: "--font-geist-sans",
  display: "swap",
});

const arialMono = localFont({
  src: [
    {
      path: "../../public/fonts/arial.ttf",
      weight: "400",
      style: "normal",
    },
  ],
  variable: "--font-geist-mono",
  display: "swap",
});

export const metadata: Metadata = {
  title: "Buildables - AI-Powered Product Creation",
  description: "Build hardware or software prototypes, run business analysis, and generate 3D visualizations without coding.",
  icons: {
    icon: "/images/Buildables-Logo.png",
    shortcut: "/images/Buildables-Logo.png",
    apple: "/images/Buildables-Logo.png",
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
        className={`${arialSans.variable} ${arialMono.variable} antialiased`}
      >
        <AuthProvider>
          {children}
        </AuthProvider>
      </body>
    </html>
  );
}
