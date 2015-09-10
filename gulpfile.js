var gulp = require('gulp');
var mocha = require('gulp-mocha');

gulp.task('mocha', function() {
  return gulp.src('./test/*.test.js').pipe(mocha());
});

gulp.task('watch', ['mocha'], function() {
  return gulp.watch(['./test/*.test.js', './lib/*.js'], ['mocha']);
});
