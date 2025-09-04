/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./src/**/*.{js,ts,jsx,tsx}",
    "./src/**/*.html"
  ],
  theme: {
    extend: {
      colors: {
        'writewise': {
          'primary': '#3b82f6',
          'secondary': '#8b5cf6',
          'accent': '#10b981',
          'danger': '#ef4444'
        }
      },
      fontFamily: {
        'sans': ['Inter', 'system-ui', 'sans-serif']
      }
    },
  },
  plugins: [],
  corePlugins: {
    preflight: false // Disable preflight to avoid conflicts with page styles
  }
}