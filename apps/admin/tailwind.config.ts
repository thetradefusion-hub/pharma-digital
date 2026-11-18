import type { Config } from "tailwindcss";

const config: Config = {
  darkMode: ["class"],
  content: ["./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        brand: {
          DEFAULT: "#0B3A6E",
          50: "#E8F0F8",
          100: "#D1E1F1",
          200: "#A3C3E3",
          300: "#75A5D5",
          400: "#4787C7",
          500: "#0B3A6E",
          600: "#09305C",
          700: "#07264A",
          800: "#051C38",
          900: "#031226",
        },
        accent: {
          DEFAULT: "#0D9488",
          50: "#F0FDFA",
          100: "#CCFBF1",
          500: "#0D9488",
          600: "#0F766E",
          700: "#115E59",
        },
        surface: {
          DEFAULT: "#FFFFFF",
          muted: "#F4F7FB",
          border: "#E8EEF5",
        },
      },
      fontFamily: {
        sans: ["var(--font-geist-sans)", "Segoe UI", "sans-serif"],
        display: ["var(--font-display)", "Georgia", "serif"],
      },
      boxShadow: {
        soft: "0 1px 2px rgba(15, 23, 42, 0.04), 0 8px 24px rgba(15, 23, 42, 0.06)",
      },
      borderRadius: {
        lg: "0.75rem",
        md: "0.5rem",
        sm: "0.375rem",
      },
    },
  },
  plugins: [],
};

export default config;
