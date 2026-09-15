import type { Config } from "tailwindcss";

const config: Config = {
  darkMode: "class",
  content: [
    "./pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        brand: {
          50: '#fcf6f4',
          100: '#f8e9e3',
          200: '#f1d2c6',
          300: '#e7b39f',
          400: '#da8d71',
          500: '#d26f4c', // Terracota principal
          600: '#c25535',
          700: '#a2442a',
          800: '#833925',
          900: '#693121',
        },
        sage: {
          50: '#f6f7f4',
          100: '#e9ece3',
          200: '#d1d8c2',
          300: '#b2c09c',
          400: '#94a578',
          500: '#798b5b', // SÃ¡lvia
          600: '#5e6e45',
          700: '#485536',
          800: '#39432c',
          900: '#313827',
        },
        warm: {
          50: '#fffbf7', // bg geral
          100: '#fcf3e8',
          200: '#f7e3ce',
          300: '#f0cead',
          400: '#e5b387',
          500: '#db9965',
          600: '#cd7f47',
          700: '#a96238',
          bg: '#fffbf7',
        },
      },
      fontFamily: {
        sans: ["var(--font-gabarito)", "sans-serif"],
        display: ["var(--font-fraunces)", "serif"],
      },
      borderRadius: {
        "2xl": "1rem",
        "3xl": "1.5rem",
      }
    },
  },
  plugins: [],
};
export default config;