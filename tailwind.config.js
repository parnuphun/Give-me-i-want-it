/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ["./views/**/*.ejs"],
  theme: {
    screens: {
      'MB' : '200px',
      'TL' : '640px',
      'LT': '1024px',
      'DT' : '1536px',
    },  
    extend: {},
  },
  plugins: [
    require('@tailwindcss/line-clamp'),
  ],
}
