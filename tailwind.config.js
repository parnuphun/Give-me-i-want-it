/** @type {import('tailwindcss').Config} */
module.exports = {
   content: [
      "./src/**/*.{html,ejs,js}",
   ],
   theme: {
      extend: {
         colors:{
            prime:{
               100:'#FFFFFF',
               200:'#4338CA',
               300:'#1E293B'
            }
         }
      },
   },
   plugins: [],
}

