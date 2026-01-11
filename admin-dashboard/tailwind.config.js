/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        primary: "#8A6642",
        secondary: "#00904B",
        error: "#F44336",
        warning: "#FFC107",
        light: "#F5F5F5",
        accent: "#EEE5DC",
      },
    },
  },
  plugins: [],
}
