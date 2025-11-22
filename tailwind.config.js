/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
    "./pages/**/*.{js,ts,jsx,tsx,mdx}", // Jaga-jaga jika pakai folder pages
  ],
  theme: {
    extend: {
        fontFamily: { 
            sans: ['Inter', 'sans-serif'] 
        },
        // Bagian ini PENTING agar Sidebar & Dashboard baru berwarna
        colors: {
            brand: {
                50: '#eff4ff',
                100: '#dbeafe',
                500: '#3b82f6',
                600: '#2563eb',
                700: '#1d4ed8',
                900: '#1e3a8a',
            },
            sidebar: {
                bg: '#0f172a',       // Warna gelap sidebar
                surface: '#1e293b',  // Warna item aktif
                text: '#94a3b8',     // Teks menu mati
                textActive: '#f8fafc', // Teks menu aktif
                border: '#334155'    // Garis pemisah
            }
        },
        boxShadow: {
            'glow': '0 0 20px rgba(37, 99, 235, 0.15)'
        }
    },
  },
  plugins: [],
}