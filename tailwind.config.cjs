/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {},
  },
  plugins: [
    require('daisyui'),
  ],
  daisyui: {
    themes: [
      "emerald", "dark", "synthwave", "halloween", "forest", "pastel", "black", "luxury", "dracula", 
      "business", "coffee", "corporate", "retro", "aqua", "wireframe", 
      "night", "dim", "sunset"
    ],
  },
} 