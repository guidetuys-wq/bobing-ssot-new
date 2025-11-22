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
      },
      colors: {
        // Untitled UI Gray (Slate/Cool Grayish)
        gray: {
          25: '#FCFCFD',
          50: '#F9FAFB',
          100: '#F2F4F7',
          200: '#EAECF0',
          300: '#D0D5DD',
          400: '#98A2B3',
          500: '#667085',
          600: '#475467',
          700: '#344054',
          800: '#1D2939',
          900: '#101828',
          950: '#0C111D',
        },
        // Untitled UI Primary (Modern Violet)
        brand: {
          25: '#FCFAFF',
          50: '#F9F5FF',
          100: '#F4EBFF',
          200: '#E9D7FE',
          300: '#D6BBFB',
          400: '#B692F6',
          500: '#9E77ED',
          600: '#7F56D9', // Primary Brand Color
          700: '#6941C6',
          800: '#53389E',
          900: '#42307D',
          950: '#2C1C5F',
        },
      },
      boxShadow: {
        // Shadow khas Untitled UI (Subtle & Layered)
        'xs': '0px 1px 2px rgba(16, 24, 40, 0.05)',
        'sm': '0px 1px 3px rgba(16, 24, 40, 0.1), 0px 1px 2px rgba(16, 24, 40, 0.06)',
        'md': '0px 4px 8px -2px rgba(16, 24, 40, 0.1), 0px 2px 4px -2px rgba(16, 24, 40, 0.06)',
        'lg': '0px 12px 16px -4px rgba(16, 24, 40, 0.08), 0px 4px 6px -2px rgba(16, 24, 40, 0.03)',
        'xl': '0px 20px 24px -4px rgba(16, 24, 40, 0.08), 0px 8px 8px -4px rgba(16, 24, 40, 0.03)',
      },
      borderRadius: {
        'lg': '0.5rem',
        'xl': '0.75rem',
        '2xl': '1rem',
      }
    },
  },
  plugins: [],
}