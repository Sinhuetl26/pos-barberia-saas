/** @type {import('tailwindcss').Config} */
export default {
  darkMode: 'class',
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      fontFamily: {
        sans: ['"Plus Jakarta Sans"', 'Inter', 'system-ui', 'sans-serif'],
        display: ['"Plus Jakarta Sans"', 'Inter', 'system-ui', 'sans-serif'],
      },
      colors: {
        obsidian: {
          950: '#07080B',
          900: '#0D0E14',
          850: '#12141C',
          800: '#171923',
          700: '#222533',
          600: '#32374A',
        },
        champagne: {
          50: '#FAF8F5',
          100: '#F4EFE6',
          200: '#E7DCBE',
          300: '#DAC693',
          400: '#CDB16B',
          500: '#C5A059', // Primary luxury gold
          600: '#A98441',
          700: '#876732',
          800: '#684E27',
          900: '#4D391D',
          950: '#2C2010',
        },
      },
      boxShadow: {
        'glow-champagne': '0 0 25px -5px rgba(197, 160, 89, 0.25)',
        'luxury': '0 20px 50px -10px rgba(0, 0, 0, 0.7), 0 0 1px 1px rgba(255, 255, 255, 0.05)',
      }
    },
  },
  plugins: [],
}
