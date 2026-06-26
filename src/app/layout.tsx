import type { Metadata, Viewport } from "next";
import { Spectral, Hanken_Grotesk } from "next/font/google";
import "katex/dist/katex.min.css";
import "./globals.css";
import { Providers } from "@/components/providers";

const serif = Spectral({
  variable: "--font-serif",
  weight: ["400", "500", "600", "700"],
  style: ["normal", "italic"],
  subsets: ["latin"],
});

const sans = Hanken_Grotesk({
  variable: "--font-sans",
  weight: ["400", "500", "600", "700"],
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Marginalia, AI Learning Tutor",
  description: "Turn any PDF into an interactive, quiz-based lesson.",
};

// resizes-content keeps the chat input above the on-screen keyboard on phones.
export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  interactiveWidget: "resizes-content",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className={`${serif.variable} ${sans.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col font-sans text-ink">
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
