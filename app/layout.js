// app/layout.js

import { Inter, Outfit, JetBrains_Mono } from "next/font/google";
import "./globals.css";
import { AuthContextProvider } from "@/context/AuthContext";
import { LayoutProvider } from "@/context/LayoutContext";
import { PurchaseCartProvider } from "@/context/PurchaseCartContext"; 

const inter = Inter({ subsets: ["latin"], variable: '--font-inter' });
const outfit = Outfit({ subsets: ["latin"], variable: '--font-outfit' });
const jetbrains = JetBrains_Mono({ subsets: ["latin"], variable: '--font-jetbrains' }); 

// UPDATE BAGIAN INI (METADATA PWA)
export const metadata = { 
  title: "Bobing SSOT System", 
  description: "Enterprise Command Center",
  manifest: "/manifest.json", // Link ke manifest
  appleWebApp: {
    capable: true,
    statusBarStyle: "default",
    title: "Bobing ERP",
  },
  formatDetection: {
    telephone: false,
  },
};

// UPDATE BAGIAN INI (VIEWPORT PWA)
export const viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  themeColor: '#FFFFFF', // Warna bar browser HP
}

export default function RootLayout({ children }) {
  return (
    <html lang="id">
      <body className={`${inter.variable} ${outfit.variable} ${jetbrains.variable} bg-background text-text-primary font-sans`}>
        <AuthContextProvider>
          <LayoutProvider>
            <PurchaseCartProvider>
              {children}
            </PurchaseCartProvider>
          </LayoutProvider>
        </AuthContextProvider>
      </body>
    </html>
  );
}