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
        // Nkap Pay brand
        cobalt: {
          DEFAULT: "#2D24E5",
          dark: "#1A12C9",
          soft: "#E3E1FF",
          faint: "#F2F1FF",
        },
        lime: {
          DEFAULT: "#C9FF3D",
          dark: "#A9DD20",
          soft: "#ECFFC6",
        },
        ink: {
          DEFAULT: "#0A0A0A",
          2: "#1F1F1D",
          3: "#424241",
        },
        muted: {
          DEFAULT: "#6B6B66",
          2: "#9F9F98",
        },
        surface: {
          DEFAULT: "#FFFFFF",
          2: "#F7F7F3",
        },
        bg: {
          DEFAULT: "#FAFAF7",
          2: "#F3F3EF",
        },
        line: {
          DEFAULT: "#E8E8E2",
          2: "#D5D5CE",
        },
        success: {
          DEFAULT: "#14935A",
          soft: "#DCF3E7",
        },
        warn: {
          DEFAULT: "#C77900",
          soft: "#FFEFD2",
        },
        rose: {
          DEFAULT: "#D33144",
          soft: "#FBE0E3",
        },
        // Payment method brand colors
        "orange-money": "#FF6B00",
        mtn: "#FFCC00",
        wave: "#1BD0F0",
        // Legacy aliases for backward compat
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
        sans: ['"Space Grotesk"', "system-ui", "-apple-system", "sans-serif"],
        display: ['"Space Grotesk"', "system-ui", "-apple-system", "sans-serif"],
        mono: ['"JetBrains Mono"', "ui-monospace", '"SF Mono"', "monospace"],
      },
      borderRadius: {
        "r1": "4px",
        "r2": "6px",
        "r3": "8px",
        "r4": "12px",
        "r5": "16px",
        "r6": "24px",
      },
      boxShadow: {
        sm: "0 1px 2px rgba(10, 10, 10, 0.04)",
        md: "0 4px 16px rgba(10, 10, 10, 0.06)",
        lg: "0 18px 48px rgba(10, 10, 10, 0.10)",
        pop: "0 24px 60px -10px rgba(45, 36, 229, 0.22)",
      },
    },
  },
  plugins: [],
};

export default config;
