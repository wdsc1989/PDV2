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
          DEFAULT: "#BE185D",
          50: "#fdf2f8",
          100: "#fce7f3",
          200: "#fbcfe8",
          300: "#f9a8d4",
          400: "#f472b6",
          500: "#ec4899",
          600: "#db2777",
          700: "#be185d",
          800: "#9d174d",
          900: "#831843",
          950: "#500724",
        },
        accent: {
          DEFAULT: "#D97706",
          50: "#fffbeb",
          100: "#fef3c7",
          600: "#d97706",
          700: "#b45309",
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
