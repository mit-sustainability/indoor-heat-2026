/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        mit: {
          red: "#A31F34",
          gray: "#8A8B8C",
        },
        surface: "#18181b",
        "surface-dim": "#09090b",
        "on-surface": "#f4f4f5",
        "on-surface-variant": "#a1a1aa",
        primary: "#fafafa",
        "primary-muted": "#d4d4d8",
        secondary: "#71717a",
        outline: "#52525b",
        "outline-variant": "#3f3f46",
        background: "#09090b",
      },
      fontFamily: {
        display: ["Manrope", "ui-sans-serif", "system-ui", "sans-serif"],
        body: ["Hanken Grotesk", "ui-sans-serif", "system-ui", "sans-serif"],
        mono: ["JetBrains Mono", "ui-monospace", "monospace"],
        sans: ["Hanken Grotesk", "ui-sans-serif", "system-ui", "sans-serif"],
      },
    },
  },
  plugins: [],
};
