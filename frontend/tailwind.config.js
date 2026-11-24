/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        nexus: {
          50: '#f4f6fb',
          100: '#e8edf6',
          200: '#cbd7eb',
          300: '#9eb7db',
          400: '#6b92c7',
          500: '#4672b1',
          600: '#345894',
          700: '#2a4677',
          800: '#253c63',
          900: '#223453',
          950: '#0b0f17',
        }
      }
    },
  },
  plugins: [],
}
