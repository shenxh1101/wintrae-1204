/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        champagne: {
          50: '#FBF8F1',
          100: '#F6EFE0',
          200: '#EBDCB8',
          300: '#DFC88D',
          400: '#D4AF37',
          500: '#C4A030',
          600: '#A88824',
          700: '#826A1C',
          800: '#5C4A14',
          900: '#362B0C',
        },
        rose: {
          50: '#FDF6F6',
          100: '#FAE8E9',
          200: '#F4D0D3',
          300: '#ECB8BD',
          400: '#E8B4B8',
          500: '#D49196',
          600: '#B86B72',
          700: '#965057',
          800: '#6E393E',
          900: '#462327',
        },
        cream: '#FAF8F5',
        espresso: '#3D3027',
      },
      fontFamily: {
        serif: ['"Noto Serif SC"', 'Georgia', 'serif'],
        sans: ['"Noto Sans SC"', 'system-ui', 'sans-serif'],
      },
      boxShadow: {
        'soft': '0 2px 8px rgba(61, 48, 39, 0.06)',
        'card': '0 4px 20px rgba(61, 48, 39, 0.08)',
      },
    },
  },
  plugins: [],
}
