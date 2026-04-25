/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        ms: {
          blue: "#0078d4",
          dark: "#0b1f3a",
          surface: "#0f172a",
          line: "#1e293b",
          text: "#e2e8f0",
          muted: "#94a3b8",
        },
      },
      fontFamily: {
        sans: [
          "'Segoe UI'",
          "system-ui",
          "-apple-system",
          "Roboto",
          "Helvetica",
          "Arial",
          "sans-serif",
        ],
      },
      boxShadow: {
        card: "0 6px 24px -10px rgba(0,0,0,0.45)",
      },
    },
  },
  plugins: [],
};
