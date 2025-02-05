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
          "primary": "#3a3637",
          "primary-content": "#dadddb",
          "secondary": "#302f32",
          "secondary-content": "#dfdddd",
          "accent": "#312d2b",
          "accent-content": "#dddfde",
          "neutral": "#171716",
          "neutral-content": "#ebebea",
          "base-100": "#232423",
          "base-200": "#1b1d1d",
          "base-300": "#242324",
          "base-content": "#dddddf",
          "info": "#383d38",
          "info-content": "#f2f3f2",
          "success": "#3d3d43",
          "success-content": "#e7e9e8",
          "warning": "#463f3f",
          "warning-content": "#e0e1e1",
          "error": "#50494b",
          "error-content": "#eaebea"
        }
      },
      "dark", "synthwave", "halloween", "forest", "pastel", "black", "luxury", "dracula", 
      "business", "coffee", "emerald", "corporate", "retro", "aqua", "wireframe", 
      "night", "dim", "sunset"
    ],
  },
} 