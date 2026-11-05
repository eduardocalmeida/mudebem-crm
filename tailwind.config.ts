import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        paper: "#f3eee6",
        card: "#fffdf9",
        ink: "#1a1814",
        forest: "#1e4d3a",
        clay: "#c45c26",
        line: "#e3d9c8",
      },
      fontFamily: {
        display: ["Fraunces", "Georgia", "serif"],
        sans: ["Outfit", "Segoe UI", "sans-serif"],
      },
      boxShadow: {
        card: "0 1px 0 rgba(28, 24, 18, 0.04), 0 12px 32px -20px rgba(48, 32, 12, 0.45)",
      },
    },
  },
  plugins: [],
};

export default config;
