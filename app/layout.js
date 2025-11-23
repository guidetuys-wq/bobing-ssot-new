// app/layout.js
import { Inter, Outfit, JetBrains_Mono } from "next/font/google"; // Load font baru
import "./globals.css";
import { AuthContextProvider } from "../context/AuthContext";
import Sidebar from "../components/Sidebar";
import Topbar from "../components/Topbar";

// Load Fonts
const inter = Inter({ subsets: ["latin"], variable: '--font-inter' });
const outfit = Outfit({ subsets: ["latin"], variable: '--font-outfit' });
const jetbrains = JetBrains_Mono({ subsets: ["latin"], variable: '--font-jetbrains' });

export const metadata = { title: "Lumina ERP", description: "Luxury Command Center" };

export default function RootLayout({ children }) {
  return (
    <html lang="id">
      <body className={`${inter.variable} ${outfit.variable} ${jetbrains.variable} bg-lumina-base text-lumina-text`}>
        <AuthContextProvider>
          <div className="flex h-screen overflow-hidden bg-lumina-base">
             <Sidebar /> 
             <div className="flex-1 flex flex-col h-full relative w-full overflow-hidden">
                <Topbar />
                <main className="flex-1 overflow-x-hidden overflow-y-auto p-6 md:p-8 scroll-smooth">
                  {children}
                </main>
             </div>
          </div>
        </AuthContextProvider>
      </body>
    </html>
  );
}