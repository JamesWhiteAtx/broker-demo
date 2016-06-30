const browserSync = require('browser-sync').create();
const del = require('del');
const glob = require("glob")
const gulp = require('gulp');
const merge2 = require('merge2');
const path = require('path');
const stylish = require('jshint-stylish');
const $ = require('gulp-load-plugins')();

const npmPath = 'node_modules/';
const sourcePath = 'src/';
const distPath = 'dist/';
const vendorPath = 'vendor/';
const stylePath = 'style/';
const scriptPath = 'js/';
const templatePath = 'templates/';
const cfg = {
    prod: false,
    src: {
        app: {
            templates: sourcePath + templatePath,
            pages: sourcePath + 'pages/**/*.njk',
            broker: sourcePath + 'broker/**/*.*',
            scss: sourcePath + stylePath + '**/*.scss',
            script: sourcePath + 'js/**/*.js',
            img: sourcePath + 'img/**/*.*',
            json: sourcePath + 'json/**/*.*',
        },
        vendor: {
            bootstrap: sourcePath + vendorPath + 'bootbase.scss',
            awesome: npmPath + 'font-awesome/scss/font-awesome.scss',
            fonts: [
                npmPath + 'font-awesome/fonts/*.*',
                npmPath + 'bootstrap-sass/assets/fonts/**/*.*'
            ],
            scripts: [
                npmPath + 'jquery/dist/jquery.js',
                npmPath + 'angular/angular.js',
                npmPath + 'tether/dist/js/tether.js',
                npmPath + 'bootstrap-sass/assets/javascripts/bootstrap.js'
            ]
        },
        delay: 0,
        sassopts: {
            outputStyle: 'nested',
            precison: 10,
            errLogToConsole: true,
            includePaths: [npmPath + 'bootstrap-sass/assets/stylesheets']
        }
    },
    dist: {
        reload: distPath + '**/*.{html,htm,css,js,json}',
        clean: distPath + '**/*',
        font: distPath + 'fonts/',
        img: distPath + 'img/',
        style: distPath + stylePath,
        script: distPath + scriptPath,
        styles: {
            app: 'app.css',
            vendor: 'vendor.css'
        },
        scripts: { 
            app: 'app.js',
            vendor: 'vendor.js'
        },
        delay: 0
    },
    reload: {
        styles: {},
        scripts: {}
    }
};

dependsOn('bootstrap.js', 'jquery.js');
dependsOn('bootstrap.js', 'tether.js');
dependsOn('angular.js', 'jquery.js');
dependsOn('app.js', '*');

dependsOn('app.css', '*');
dependsOn('base.css', '*');

function dependsOn(name, required) {
    name = path.basename(name).toLowerCase();
    required = path.basename(required).toLowerCase();
    cfg.depends = cfg.depends || [];
    var dependant = cfg.depends.find(function(elm) {return elm.name == name;});
    if (! dependant) {
        dependant = {name: name, requires: []};
        cfg.depends.push(dependant);
    }

    var idx = dependant.requires.indexOf(required);
    if (idx === -1) {
        dependant.requires.push(required);
    }
}


// set the config to production
function prodBuild(cb) {
  cfg.prod = true;
  if (cb) {
    cb();
  }
}

function ifProd(fcn) {
    return cfg.prod ? fcn : $.util.noop();
}

// CLEAN
// remove all of the dist files
function clean() {
  return del([ cfg.dist.clean ]);
}

gulp.task('clean', clean);

// STYLES

function appStyle() {
    return gulp
        .src(cfg.src.app.scss)
        .pipe($.sass(cfg.src.sassopts))
        .pipe(ifProd($.concat(cfg.dist.styles.app)))
        .pipe(ifProd($.minifyCss()))
        .pipe($.filenames("app.styles"))
        .pipe(gulp.dest(cfg.dist.style));
}

gulp.task('style:app', appStyle);

function vendorStyle() {
    return  merge2(
        gulp.src(cfg.src.vendor.awesome)
            .pipe($.sass().on('error', $.sass.logError)),
        gulp.src(cfg.src.vendor.bootstrap)
            .pipe($.sass(cfg.src.sassopts))
            .pipe($.rename('bootstrap.css'))
        )
        .pipe(ifProd($.concat(cfg.dist.styles.vendor)))
        .pipe(ifProd($.minifyCss()))
        .pipe($.filenames("vendor.styles"))
        .pipe(gulp.dest(cfg.dist.style));
}

gulp.task('style:vendor', vendorStyle);

function bootStyle() {
	return gulp.src(cfg.src.vendor.bootstrap)
    	.pipe($.sass(cfg.src.sassopts))
        .pipe($.rename('bootstrap.css'))

        .pipe(gulp.dest(cfg.dist.style));
}

function vendorFont() {
	return gulp
        .src(cfg.src.vendor.fonts)
        .pipe(gulp.dest(cfg.dist.font));
}

gulp.task('font:vendor', vendorFont);

function appImg() {
	return gulp
        .src(cfg.src.app.img)
        .pipe(gulp.dest(cfg.dist.img));
}

gulp.task('img:app', appImg);

var style = gulp.parallel(vendorStyle, vendorFont, appImg, appStyle);

gulp.task('style', style);

// SCRIPTS

function appScript() {
    return gulp
        .src(cfg.src.app.script)
        //.pipe($.jshint())
        //.pipe($.jshint.reporter(stylish))
        .pipe(ifProd($.concat(cfg.dist.scripts.app)))
        .pipe($.ngAnnotate())
        .pipe(ifProd($.uglify({ compress: { sequences: false, join_vars: false } })))
        .pipe($.filenames("app.scripts"))
        .pipe(gulp.dest(cfg.dist.script));
}

gulp.task('script:app', appScript);

function vendorScript() {
    return gulp
        .src(cfg.src.vendor.scripts)
        .pipe(ifProd($.concat(cfg.dist.scripts.vendor)))
        .pipe(ifProd($.uglify({ compress: { sequences: false, join_vars: false } })))
        .pipe($.filenames("vendor.scripts"))
        .pipe(gulp.dest(cfg.dist.script));
}

gulp.task('script:vendor', vendorScript);

var script = gulp.parallel(vendorScript, appScript);

gulp.task('script', script);

// HTML

// COPY HTML
function appHtml(cb) {
    var styles = glob.sync(stylePath + '**/*.css', {cwd: distPath}).sort(compare);
    var scripts = glob.sync(scriptPath + '**/*.js', {cwd: distPath}).sort(compare);

	return gulp.src(cfg.src.app.pages)
        .pipe($.data(function (file) {
            return { 
                name: file.stem,
                styles: styles,
                scripts: scripts
            };
        }))
        .pipe($.nunjucksRender({
            path: [cfg.src.app.templates],
            envOptions: {tags: {
                variableStart: '{$',
                variableEnd: '$}',                
            }}
         }))
        .pipe($.prettify({indent_size: 2}))
        .pipe($.flatten())
        .pipe(gulp.dest(distPath));
}

gulp.task('html:app', appHtml);

function brokerCopy() {
  return gulp.src(cfg.src.app.broker)
    .pipe(gulp.dest(distPath));
}

gulp.task('copy:broker', brokerCopy);

function appJson() {
	return gulp
        .src(cfg.src.app.json)
        .pipe(gulp.dest(distPath));
}

// BUILD
var build = gulp.series(gulp.parallel(style, script, appJson, brokerCopy), 
    appHtml);

gulp.task('build', build);

var buildProd = gulp.series(prodBuild, build);

gulp.task('build:prod', buildProd);

// SERVER

function server(cb) {
    browserSync.init({
        server: "./" + distPath,
        notify: false
        // files: ["./dist/**/*.{html,htm,css,js}"],
        // server: { baseDir: "./dist" }
    }, cb);
}

gulp.task('server', server);

// RELOAD

function checkForReplace(cb) {
    var result = false;
    
    if (cfg.reload.scripts.pre) {
        recordScripts('post');
        result = diffArrs(cfg.reload.scripts.pre, cfg.reload.scripts.post);
    } else if (cfg.reload.styles.pre) {
        recordStyles('post');
        result = diffArrs(cfg.reload.styles.pre, cfg.reload.styles.post);
    }

    cfg.reload= {
        styles: {},
        scripts: {}
    };

    if (result) {
        return appHtml(cb);
    } else {
        cb();
    } 
}

function reload(cb) {
    browserSync.reload();
    cb();
}

// WATCH

function diffArrs(arr1, arr2) {
    return !( (arr1 && arr2) && (arr1.length && arr2.length) &&
        (arr1.length === arr2.length) );
}

function recordFiles(type, run, cwd, pattern) {
    cfg.reload[type][run] = glob.sync(pattern, {cwd: cwd});
}

function recordStyles(run) {
    recordFiles('styles', run, cfg.dist.style, '**/*.css')
}

function recordScripts(run) {
    recordFiles('scripts', run, cfg.dist.script, '**/*.js')
}

function watch(cb) {
    
    gulp.watch(cfg.src.app.scss, {delay: cfg.src.delay}, gulp.series(
        function preStyle(cb) { recordStyles('pre');  cb(); },
        appStyle
    ));
    
    gulp.watch(cfg.src.app.script, {delay: cfg.src.delay}, gulp.series(
        function preScript(cb) { recordScripts('pre');  cb(); },
        appScript
    ));
    
    gulp.watch([cfg.src.app.templates + '**/*', cfg.src.app.pages], 
        {delay: cfg.src.delay}, appHtml);
    
    gulp.watch(cfg.src.app.json, {delay: cfg.src.delay}, appJson);

    gulp.watch(cfg.src.app.broker, {delay: cfg.src.delay}, brokerCopy);

    gulp.watch(cfg.dist.reload, {delay: cfg.dist.delay}, gulp.series(
            checkForReplace,
            reload
    ));
}

gulp.task('watch', watch);

// DEV
gulp.task('dev', gulp.series(
    clean,
    build,
    server,
    watch
));

// PROD
gulp.task('prod', gulp.series(
    clean,
    buildProd,
    server
));

function compare(a, b) {
    a = path.basename(a).toLowerCase();
    b = path.basename(b).toLowerCase();
    var result = 0;
    var dependant = cfg.depends.find(function(elm) {return elm.name == a;});
    if (dependant) {
        var idx = dependant.requires.indexOf(b);
        if (idx === -1) {
            idx = dependant.requires.indexOf('*');
        }
        if (idx !== -1) {
            result = 1;
        }
    } else if ( a < b ) {
        result = -1;
    } else if ( a > b ) {
        result = 1;
    }
    return result;
}