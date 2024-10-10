// there are noting here
// just try to use gulp for reload file but... socket better

const gulp = require('gulp');
const browserSync = require('browser-sync').create();

gulp.task('serve', function () {
   browserSync.init({
      proxy: {
         target: 'http://localhost:3001', //express server
         ws: true // open WebSocket
      },
      open: false, // open browser
   });

   gulp.watch('./src/*.html').on('change', browserSync.reload);
   gulp.watch('./public/css/*.css').on('change', browserSync.reload);
});

// Default task
gulp.task('default', gulp.series('serve'));
