/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      fontFamily: {
        sans: ['Inter', 'sans-serif'],
        display: ['Outfit', 'sans-serif'], // Untuk Headings
        mono: ['JetBrains Mono', 'monospace'], // Untuk SKU
      },
      colors: {
        lumina: {
          base: '#0B0C10',      // Background Utama (Deep OLED Black)
          surface: '#12141C',   // Background Kartu/Sidebar
          highlight: '#1C1F2B', // Warna Hover
          border: '#2A2E3B',    // Warna Garis Tipis
          text: '#E2E8F0',      // Teks Utama (Putih Tulang)
          muted: '#94A3B8',     // Teks Sekunder (Abu-abu)
          gold: {
            DEFAULT: '#D4AF37', // Warna Aksen Utama (Emas)
            dim: 'rgba(212, 175, 55, 0.1)', // Emas Transparan (Background badge)
            glow: 'rgba(212, 175, 55, 0.5)', // Efek Cahaya Emas
          }
        }
      },
      boxShadow: {
        'gold-glow': '0 0 15px rgba(212, 175, 55, 0.15)', // Glow halus
        'glass': '0 8px 32px 0 rgba(0, 0, 0, 0.37)',      // Bayangan kaca
      }
    },
  },
  plugins: [],
}