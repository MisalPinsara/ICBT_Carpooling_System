/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{js,jsx}"],
  theme: {
    extend: {
      colors: {
        brand: {
          blue: "#2f68e8",
          blueDark: "#285bd2",
          navy: "#101827",
          ink: "#0f172a",
          muted: "#6b7a90",
          line: "#dbe4ef",
          page: "#fbfcff",
          green: "#18a34a",
          amber: "#f59e0b",
          cyan: "#0ea5e9"
        }
      },
      fontFamily: {
        sans: ["Inter", "ui-sans-serif", "system-ui", "-apple-system", "BlinkMacSystemFont", "Segoe UI", "sans-serif"]
      }
    }
  },
  plugins: []
};
