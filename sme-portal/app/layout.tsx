import type { Metadata } from "next";
// We'll skip the 'next/font' import for now as it was causing a build error
// import { Inter } from "next/font/google"; 
import "./globals.css"; // This file loads our Tailwind styles
import { AuthProvider } from "../context/AuthContext"; // 1. Using relative path
import { WalletProvider } from "../context/WalletContext"; // 2. Add WalletProvider

// const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "Catalyst SME Portal",
  description: "Your Performance is Your Collateral",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      {/* 2. Wrap our entire app in the AuthProvider and WalletProvider */}
      {/* <body className={inter.className}> */}
      <body>
        <AuthProvider>
          <WalletProvider>
            {children}
          </WalletProvider>
        </AuthProvider>
      </body>
    </html>
  );
}