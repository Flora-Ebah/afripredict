/** @type {import('tailwindcss').Config} */
// Charte AfriPredict — les valeurs vivent dans globals.css (:root) pour être
// modifiables à chaud ; ce fichier ne fait que les référencer.
module.exports = {
  darkMode: "class",
  content: ["./app/**/*.{ts,tsx}", "./components/**/*.{ts,tsx}", "./features/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        terra: {
          50: "var(--terra-50)",
          100: "var(--terra-100)",
          200: "var(--terra-200)",
          300: "var(--terra-300)",
          400: "var(--terra-400)",
          500: "var(--terra-500)",
          600: "var(--terra-600)",
          700: "var(--terra-700)",
          800: "var(--terra-800)",
          900: "var(--terra-900)",
        },
        primary: "var(--gris-900)",
        secondary: "var(--terra-600)",
        success: "#16A34A",
        danger: "#DC2626",
        background: "#FFFFFF",
        surface: "#FFFFFF",
        borderc: "var(--gris-200)",
        muted: "var(--gris-400)",
      },
      fontFamily: {
        sans: ["Plus Jakarta Sans", "system-ui", "-apple-system", "Segoe UI", "sans-serif"],
      },
      borderRadius: {
        DEFAULT: "var(--radius)",
        md: "var(--radius)",
        lg: "var(--radius-lg)",
      },
    },
  },
  plugins: [],
};
