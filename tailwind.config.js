// tailwind.config.js
export default {
  // 1. Tentukan file mana yang akan di-scan oleh Tailwind
  content: [
    "./index.html",
    // Ini penting agar Tailwind memproses semua kode JS di folder src
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  
  // 2. Tentukan konfigurasi custom Anda di dalam theme.extend
  theme: {
    extend: {
        // Mengambil konfigurasi font 'Inter'
        fontFamily: { 
            sans: ['Inter', 'sans-serif'] 
        },
        
        // Mengambil konfigurasi warna custom Anda
        colors: {
            slate: { 
                850: '#1e293b', 
                950: '#020617' 
            },
            indigo: { 
                50: '#eef2ff', 
                100: '#e0e7ff', 
                500: '#6366f1', 
                600: '#4f46e5', 
                700: '#4338ca', 
                900: '#312e81' 
            }
        }
    }
  },
  
  // Plugin jika ada (kosongkan jika tidak ada)
  plugins: [],
}