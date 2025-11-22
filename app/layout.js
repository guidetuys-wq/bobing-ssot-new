// app/layout.js
import { Inter } from "next/font/google";
import "./globals.css";
import { AuthContextProvider } from "../context/AuthContext";
import Sidebar from "../components/Sidebar";

const inter = Inter({ subsets: ["latin"] });

export const metadata = {
  title: "Bobing SSOT",
  description: "Command Center",
};

export default function RootLayout({ children }) {
  return (
    <html lang="id">
      <body className={`${inter.className} bg-slate-50 text-slate-900`}>
        <AuthContextProvider>
          <div className="flex h-screen overflow-hidden">
             <Sidebar /> 
             
             {/* Tambahkan ml-0 md:ml-72 agar konten tidak tertutup sidebar fixed */}
             <div className="flex-1 flex flex-col h-full relative w-full overflow-hidden bg-slate-50 md:ml-72 transition-all duration-300">
                
                {/* Header Mobile bisa ditambahkan disini nanti */}
                
                <main className="flex-1 overflow-x-hidden overflow-y-auto p-6 md:p-10 relative scroll-smooth">
                  {/* Tambahkan max-width agar konten tidak terlalu melebar di layar besar */}
                  <div className="max-w-7xl mx-auto fade-in">
                    {children}
                  </div>
                </main>
             </div>
          </div>
        </AuthContextProvider>
      </body>
    </html>
  );
}