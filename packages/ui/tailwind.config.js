/** @type {import('tailwindcss').Config} */
module.exports = {
  // The ThemeProvider toggles `dark` on <html>; the compiled dist/styles.css must
  // key its `dark:` variants on that class, not on the OS colour scheme.
  darkMode: "class",
  content: ["./src/**/*.{js,jsx,ts,tsx}"],
  theme: {
    extend: {},
  },
  plugins: [],
};
