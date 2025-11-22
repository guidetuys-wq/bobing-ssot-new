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
      <body className={`${inter.className} bg-slate-50 text-slate-800`}>
        <AuthContextProvider>
          <div className="flex h-screen overflow-hidden">
             {/* Sidebar component nanti ditaruh di sini, logic hide/show login ada di component */}
             <Sidebar /> 
             
             <div className="flex-1 flex flex-col h-full relative w-full overflow-hidden bg-slate-50">
                {/* Header/Topbar bisa dibuat component terpisah juga */}
                <main className="flex-1 overflow-x-hidden overflow-y-auto p-4 md:p-8 relative scroll-smooth">
                  {children}
                </main>
             </div>
          </div>
        </AuthContextProvider>
      </body>
    </html>
  );
}