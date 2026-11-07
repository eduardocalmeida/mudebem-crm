import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        paper: "#F7F4EF",
        beige: "#F3ECE4",
        card: "#FFFFFF",
        ink: "#101828",
        gold: "#B89870",
        muted: "#6B6F76",
        line: "#E2D9CF",
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
