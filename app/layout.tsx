import type { Metadata } from "next";
import { Inter, Lilita_One, Share_Tech } from "next/font/google";
import "./globals.css";
import { ClientProviders } from "@/components/ClientProviders";

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
});

const lilitaOne = Lilita_One({
  weight: "400",
  subsets: ["latin"],
  variable: "--font-lilita",
});

const shareTech = Share_Tech({
  weight: "400",
  subsets: ["latin"],
  variable: "--font-share-tech",
});

export const metadata: Metadata = {
  title: "SketchNFT - AI Art NFT Platform on 0G",
  description: "Generate AI art from sketches, images, or text prompts and mint as NFTs on 0G Chain",
  keywords: ["NFT", "0G", "AI", "Gemini", "Web3", "Blockchain", "SketchNFT", "Art"],
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="dark" suppressHydrationWarning>
      <body className={`${inter.variable} ${lilitaOne.variable} ${shareTech.variable} font-sans antialiased`}>
        <ClientProviders>
          {children}
        </ClientProviders>
      </body>
    </html>
  );
}
