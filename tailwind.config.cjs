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
      {
        rill: {
          "primary": "#3d3f42",
          "primary-content": "#e7e9e8",
          "secondary": "#343135",
          "secondary-content": "#f2f2f3",
          "accent": "#3b3a40",
          "accent-content": "#dfe1e1",
          "neutral": "#1b1d1d",
          "neutral-content": "#eeeced",
          "base-100": "#202122",
          "base-200": "#1d1b1d",
          "base-300": "#1f201e",
          "base-content": "#e5e5e6",
          "info": "#363430",
          "info-content": "#e2e4e2",
          "success": "#47454a",
          "success-content": "#eeeeec",
          "warning": "#463f3f",
          "warning-content": "#eceeee",
          "error": "#333838",
          "error-content": "#ededee"
        }
      },
      "dark", "synthwave", "halloween", "forest", "pastel", "black", "luxury", "dracula", 
      "business", "coffee", "emerald", "corporate", "retro", "aqua", "wireframe", 
      "night", "dim", "sunset"
    ],
  },
} 