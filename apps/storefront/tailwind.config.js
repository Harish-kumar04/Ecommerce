/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./app/**/*.{js,ts,jsx,tsx}",
    "./components/**/*.{js,ts,jsx,tsx}",
    "./lib/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        brand: {
          red: {
            DEFAULT: "rgb(var(--brand-red) / <alpha-value>)",
            dark: "#C41D1A",
            soft: "#F8C9C8",
            light: "#FDEEEE",
          },
          black: "rgb(var(--brand-black) / <alpha-value>)",
          white: "rgb(var(--brand-white) / <alpha-value>)",
        },
      },
      fontFamily: {
        sans: [
          "var(--font-inter)",
          "var(--font-tamil)",
          "system-ui",
          "-apple-system",
          "Segoe UI",
          "Roboto",
          "Arial",
          "sans-serif",
        ],
      },
      maxWidth: {
        site: "1440px",
      },
      boxShadow: {
        card: "0 1px 2px rgba(0,0,0,.04), 0 4px 16px rgba(0,0,0,.06)",
        glow: "0 8px 30px rgba(229,35,32,.12)",
        "glow-lg": "0 14px 44px rgba(229,35,32,.18)",
      },
    },
  },
  plugins: [],
};
