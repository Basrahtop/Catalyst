import type { Metadata } from "next";
import "./globals.css";
import { AuthProvider } from "@/context/AuthContext";
import { WalletProvider } from "@/context/WalletContext";

export const metadata: Metadata = {
  title: "Catalyst Investor Dashboard",
  description: "Investment opportunities and portfolio management",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
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
