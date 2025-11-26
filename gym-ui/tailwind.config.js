/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,jsx,ts,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        gym: {
          primary: "#16A34A",
          "primary-dark": "#15803D",
          "primary-soft": "#D1FAE5",
          dark: "#020617",
          "dark-soft": "#0F172A",
          "dark-card": "#020617",
          muted: "#E5E7EB",
          border: "#E5E7EB",
          "text-main": "#0F172A",
          "text-muted": "#6B7280",
          info: "#2563EB",
          warning: "#F59E0B",
          danger: "#DC2626",
        },
      },
    },
  },
  plugins: [],
};
