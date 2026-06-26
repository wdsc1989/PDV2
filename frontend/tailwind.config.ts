import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        primary: {
          DEFAULT: "#A16207",
          50: "#FEF8E8",
          100: "#FEF3C7",
          200: "#FDE6A2",
          300: "#FCD370",
          400: "#FBBF24",
          500: "#F59E0B",
          600: "#D97706",
          700: "#A16207",
          800: "#854D0E",
          900: "#713F12",
          950: "#451A03",
        },
        rose: {
          DEFAULT: "#A16207",
          50: "#FAF7F2",
          100: "#F5EFEB",
          200: "#EADEC9",
          300: "#DBCCA9",
          400: "#CBB889",
          500: "#B59E6C",
          600: "#A16207",
          700: "#854D0E",
          800: "#713F12",
          900: "#5C320A",
          950: "#3D2005",
        },
        accent: {
          DEFAULT: "#A16207",
          50: "#fef8e8",
          100: "#fef3c7",
          600: "#CA8A04",
          700: "#A16207",
        },
        success: "#16a34a",
        warning: "#d97706",
        danger: "#dc2626",
        info: "#3b82f6",
      },
      fontFamily: {
        sans: ["var(--font-nunito)", "sans-serif"],
        heading: ["var(--font-rubik)", "sans-serif"],
      },
    },
  },
  plugins: [],
};
export default config;
