import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  darkMode: "class",
  theme: {
    extend: {
      colors: {
        gold: {
          50: "#FBF7EB",
          100: "#F5EBD0",
          200: "#EDD9A3",
          300: "#E4C776",
          400: "#D4AF37",
          500: "#C09B2D",
          600: "#A38224",
          700: "#7A611B",
          800: "#524112",
          900: "#2A2009",
        },
        navy: {
          50: "#E6EBF2",
          100: "#B3C1D6",
          200: "#8097BA",
          300: "#4D6D9E",
          400: "#1A4382",
          500: "#001F3F",
          600: "#001B38",
          700: "#00152B",
          800: "#000F1E",
          900: "#000A14",
        },
      },
      fontFamily: {
        sans: ["Inter", "system-ui", "sans-serif"],
      },
    },
  },
  plugins: [],
};

export default config;
