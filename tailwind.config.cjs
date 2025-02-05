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
          "primary": "#aae4cb",
          "primary-content": "#524add",
          "secondary": "#bdf7ef",
          "secondary-content": "#c06a8b",
          "accent": "#367992",
          "accent-content": "#6ad1e0",
          "neutral": "#814f8d",
          "neutral-content": "#737ca6",
          "base-100": "#aaf3ca",
          "base-200": "#da3c83",
          "base-300": "#936c43",
          "base-content": "#675e07",
          "info": "#d6a6c7",
          "info-content": "#20e8a7",
          "success": "#b16693",
          "success-content": "#020247",
          "warning": "#ee7d37",
          "warning-content": "#ed8ec5",
          "error": "#2a4304",
          "error-content": "#9dab5a"
        }
      },
      "dark", "synthwave", "halloween", "forest", "pastel", "black", "luxury", "dracula", 
      "business", "coffee", "emerald", "corporate", "retro", "aqua", "wireframe", 
      "night", "dim", "sunset"
    ],
  },
} 