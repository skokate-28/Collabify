/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        darkBg: '#0D0E11',
        darkSurface: '#16181D',
        darkBorder: '#2A2D35',
        darkInput: '#1E2028',
        indigoAccent: '#6366F1',
      },
      fontFamily: {
        sora: ['Sora', 'sans-serif'],
        dmsans: ['DM Sans', 'sans-serif'],
      },
    },
  },
  plugins: [],
}
