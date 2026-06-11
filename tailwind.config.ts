import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
    "./lib/**/*.{js,ts,jsx,tsx,mdx}"
  ],
  theme: {
    extend: {
      colors: {
        graphite: {
          950: "#07090b",
          900: "#0d1117",
          850: "#121820",
          800: "#17202a",
          700: "#243142"
        },
        amberline: "#f6b84b",
        mintline: "#2dd4bf",
        dangerline: "#fb7185"
      },
      boxShadow: {
        glow: "0 0 32px rgba(45, 212, 191, 0.12)"
      }
    }
  },
  plugins: []
};

export default config;
