import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import { CartProvider } from "@/context/CartContext"; // Import the provider

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "Catalyst Marketplace",
  description: "Shop from local SMEs",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className={inter.className}>
        {/* We wrap the whole app so the Cart is available everywhere */}
        <CartProvider>
          {children}
        </CartProvider>
      </body>
    </html>
  );
}