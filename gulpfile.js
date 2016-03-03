'use strict';

// Constant
var CONFIG = require('./site-config.json');

var FOLDER = 'build/';
var BIN = 'bin';
var PROXY = 'http://localhost:3000';
var SRC_FOLDER = './src/';
var _ = require('lodash');

// Gulp plugins
var gulp = require('gulp');
var nodemon = require('gulp-nodemon'); // Node Server watch
var argv = require('yargs').argv;
var file = require('gulp-file');
var data = require('gulp-data');
var gulpif = require('gulp-if');
var source = require('vinyl-source-stream');
var buffer = require('vinyl-buffer');
var disc = require('disc');
var path = require('path');
var fs = require('fs');
var mkdirp = require('mkdirp');
var newer = require('gulp-newer');
var RevAll = require('gulp-rev-all');
// HTML Plugins
var jade = require('gulp-jade');
// CSS Plugins
var sass = require('gulp-sass');
var autoprefixer = require('gulp-autoprefixer');
var imagemin = require('gulp-imagemin');
var pngquant = require('imagemin-pngquant');
// JS Plugins
var browserify = require('browserify');
var browserSync = require('browser-sync');
var sourcemaps = require('gulp-sourcemaps');
var stripDebug = require('gulp-strip-debug');
var jshint = require('gulp-jshint');
var uglify = require('gulp-uglify');
var babelify = require('babelify')
// Gulp Default
gulp.task('default', ['rebuild'], function () {
    var revAll = new RevAll({ dontRenameFile: [/^\/favicon.ico$/g, '.html'] });
    gulp.src(FOLDER + '**')
        .pipe(revAll.revision())
        .pipe(gulp.dest(BIN));
});

// Setup Node Monitor server
gulp.task('nodemon', function (cb) {
    var started = false;
    return nodemon({
        script: 'index.js', // entry point app file
        ignore: [SRC_FOLDER, FOLDER]
    }).on('start', function () {
        // to avoid nodemon being started multiple times
        // thanks @matthisk
        if (!started) {
            cb();
            started = true; 
        } 
    });
});

/**
 * Setup HTML Processes
 */

// Process Jade Template files
gulp.task('templates', function() {
    // Loop through Config file for locales
    _(CONFIG.locale).forEach(function (value) {
        // Created Directories for Locales. Default Site on Root
        var tOutputFolder = (CONFIG.defaultLocale == value) ? FOLDER : FOLDER + value ;
        mkdirp( tOutputFolder , function (err) {
            if (err) console.error(err)
            else console.log('site folder created!')
        });

        gulp.src([
            '!src/jade/**/_*/**',
            'src/jade/**/*.jade'
        ])
            .pipe(data(function(file) {
                return require('./'+ SRC_FOLDER +'locale/'+ value +'/data.json');
            }))
            .pipe(jade({
                basedir : SRC_FOLDER + 'jade',
                pretty: false
            }))
            .pipe(gulp.dest(''+tOutputFolder+''))
    });

    // make folder
    /*mkdirp(''+FOLDER+'', function (err) {
        if (err) console.error(err)
        else console.log('site folder created!')
    });*/

  
});

// Rebuild Jade, Scripts & do page reload
gulp.task('rebuild', ['templates', 'bundle', 'minify-js', 'styles'], function () {
    browserSync.reload();
});

/**
 * CSS Proccesses
 */
gulp.task('styles', function() {
    gulp.src(SRC_FOLDER + 'sass/**/*.scss')
        .pipe(sass().on('error', sass.logError))
        .pipe(gulp.dest(FOLDER + 'css/'));
});
/**
 * Setup Script Processes
 */

// 
// Grab relevent js files
var scripts = fs.readdirSync(SRC_FOLDER + 'js').filter( function(f) {
    return (/\.(js)$/i).test(f); // only allow any files with js extensions in js folder, exclude folders
});
// Set inputs and outputs
var inputs = scripts.map( function(script) {
    return SRC_FOLDER + 'js/' + script;
});
var outputs = scripts.map( function(script) {
    return ''+FOLDER+'js/' + script;
});
//
// Minify Js
gulp.task ('minify-js', function () {
     return gulp.src(FOLDER + 'js/*.js')
        .pipe(gulpif(argv.production, uglify()) )
        .pipe(gulp.dest( FOLDER + 'js'));
});

//
// Lint js scripts
gulp.task('jshint', function() {
    return gulp.src('js/*.js')
        .pipe(jshint())
        .pipe(jshint.reporter('jshint-stylish'))
        .pipe(jshint.reporter('fail'))
});

//
// Bundle up js scripts
gulp.task('bundle', ['jshint'], function() {
    // make folder
    mkdirp(''+FOLDER+'js', function (err) {
        if (err) console.error(err)
        else console.log('js folder created!')
    });

    var b = browserify({
        entries : inputs,
        debug: false

    });
    
    b.plugin('factor-bundle', { outputs: outputs });

    return b
        .transform("babelify", {presets: ["es2015", "react"]})
        .bundle()
        .pipe(source('./'+FOLDER+'js/common.js'))
        .pipe(buffer())

        .pipe( gulpif(argv.production, sourcemaps.init({loadMaps: true})) )
        .pipe(gulpif( argv.production, uglify() ))
        .pipe(sourcemaps.write('./'))
        .pipe(gulp.dest('./'));
});


// Watch task
gulp.task('watch', function () {
    gulp.watch([
        SRC_FOLDER + 'js/**/*.js',
        SRC_FOLDER + 'sass/**/*.scss',
        SRC_FOLDER + 'jade/**/*.jade'
    ], ['rebuild']);
});

gulp.task('templates-watch', function () {
    gulp.watch([
        SRC_FOLDER + 'jade/**/*.jade',
        SRC_FOLDER + 'locale/**/*.json'
    ], ['templates']);
});

// Setup BrowserSync
gulp.task('browser-sync',['templates', 'nodemon'], function() {
     browserSync.init(null, {
        proxy: PROXY,
        files: ["bin/**/*.*"],
        browser: "google chrome",
        port: 7000,
    });
});

// Start up server & Serve files
gulp.task('serve', ['rebuild', 'browser-sync', 'watch']);