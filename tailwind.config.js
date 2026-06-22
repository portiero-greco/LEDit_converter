/** @type {import('tailwindcss').Config} */
export default {
  content: ['./src/renderer/src/**/*.{js,ts,jsx,tsx}', './src/renderer/index.html'],
  theme: {
    extend: {
      colors: {
        app: '#0c0d12',
        surface: '#12141c',
        card: '#181b26',
        border: '#212438',
        accent: '#2d4a8f',
        'accent-hover': '#3658a8',
        primary: '#ffffff',
        secondary: '#8b8fa8',
        success: '#4ade80',
        error: '#f87171',
        warning: '#fbbf24'
      },
      fontFamily: {
        sans: ['-apple-system', 'BlinkMacSystemFont', 'Segoe UI', 'Roboto', 'sans-serif']
      }
    }
  },
  plugins: []
}
