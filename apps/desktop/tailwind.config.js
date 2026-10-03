/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      fontFamily: {
        sans: ['Inter', '-apple-system', 'BlinkMacSystemFont', 'sans-serif'],
      },
      colors: {
        macos: {
          bg: '#ebedf2',
          card: '#ffffff',
          sidebar: '#fbfbfd',
          border: '#ebecee',
          blue: '#0d7eff',
          'blue-hover': '#026be5',
          gray: '#7e838f',
          graylight: '#a4a8b2',
          orange: '#f59e0b',
          badge: '#f79e1b'
        }
      },
      boxShadow: {
        'window': '0 25px 60px -15px rgba(22, 28, 45, 0.16), 0 0 1px 1px rgba(0, 0, 0, 0.04)',
        'app-icon': '0 4px 10px rgba(0,0,0,0.06), 0 1px 3px rgba(0,0,0,0.05)',
      }
    }
  },
  plugins: [],
}
