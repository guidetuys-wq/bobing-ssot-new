// app/layout.js
import { Inter } from "next/font/google";
import "./globals.css";
import { AuthContextProvider } from "../context/AuthContext";
import Sidebar from "../components/Sidebar";
import Topbar from "../components/Topbar";

const inter = Inter({ subsets: ["latin"] });

export const metadata = {
  title: "Bobing SSOT - Command Center",
  description: "Modern ERP System",
};

export default function RootLayout({ children }) {
  return (
    <html lang="id">
      <body className={inter.className}>
        <AuthContextProvider>
          <div className="flex h-screen overflow-hidden bg-[#F8F9FC]">
             {/* Sidebar Tetap di Kiri */}
             <Sidebar /> 
             
             {/* Area Konten Utama */}
             <div className="flex-1 flex flex-col h-full relative w-full overflow-hidden">
                <Topbar /> {/* Header Glass */}
                
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