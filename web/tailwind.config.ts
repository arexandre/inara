import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      // Paleta Inara — orgânica, acolhedora, residencial
      colors: {
        brand: {
          50:  "#fef9f0",
          100: "#fdf0d5",
          200: "#f9dba6",
          300: "#f4bf6a",
          400: "#ef9f35",
          500: "#e8831a", // laranja-mel principal
          600: "#ce6712",
          700: "#a94e12",
          800: "#883f16",
          900: "#6f3515",
        },
        sage: {
          50:  "#f4f7f4",
          100: "#e5ede4",
          200: "#cbdbc9",
          300: "#a4c0a0",
          400: "#75a070",
          500: "#528050", // verde-sálvia
          600: "#3f6540",
          700: "#355236",
          800: "#2c422d",
          900: "#253726",
        },
        warm: {
          50:  "#fdfaf7",
          100: "#f7f0e6",
          200: "#ede0cb",
          300: "#e0caab",
          400: "#cda97e",
          500: "#b98b58",
          bg:  "#fdfaf7", // fundo geral
        },
      },
      fontFamily: {
        sans: ["var(--font-inter)", "system-ui", "sans-serif"],
        display: ["var(--font-fraunces)", "Georgia", "serif"],
      },
      borderRadius: {
        "2xl": "1rem",
        "3xl": "1.5rem",
        "4xl": "2rem",
      },
    },
  },
  plugins: [],
};

export default config;
