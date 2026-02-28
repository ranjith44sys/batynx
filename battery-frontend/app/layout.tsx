import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import Navigation from "./components/Navigation";
import { WalletProvider } from "./context/WalletContext";
import { AuthProvider } from "./context/AuthContext";

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "EV Battery Passport | Blockchain Traceability",
  description: "Secure, immutable lifecycle tracking for electric vehicle batteries using blockchain technology.",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className={inter.className} suppressHydrationWarning>
        <AuthProvider>
          <WalletProvider>
            <Navigation />
            {children}
          </WalletProvider>
        </AuthProvider>
      </body>
    </html>
  );
}
