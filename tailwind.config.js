/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        danger: "#ef4444",
        positive: "#22c55e",
        warning: "#eab308",
        tertiary: "#9ca3af",
      },
      fontFamily: {
        sans: "var(--kimi-font-sans, system-ui, -apple-system, sans-serif)",
      },
      spacing: {
        xs: "4px",
        sm: "8px",
        md: "12px",
        lg: "16px",
        xl: "20px",
        "2xl": "24px",
        "3xl": "32px",
      },
      borderRadius: {
        sm: "8px",
        md: "10px",
      },
    },
  },
  plugins: [],
};
