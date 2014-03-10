'use strict';
var fs = require('fs');
var crypto = require('crypto');
var path = require('path');
var eachAsync = require('each-async');
var chalk = require('chalk');
var sass = require('node-sass');

module.exports = function (grunt) {
	grunt.registerMultiTask('sass', 'Compile SCSS to CSS', function () {
		var cwd = process.cwd();

		var options = this.options({
			includePaths: [],
			outputStyle: 'nested',
			sourceComments: 'none'
		});

		// set the sourceMap path if the sourceComment was 'map', but set source-map was missing
		if (options.sourceComments === 'map' && !options.sourceMap) {
			options.sourceMap = true;
		}

		// set source map file and set sourceComments to 'map'
		if (options.sourceMap) {
			options.sourceComments = 'map';
		}

		eachAsync(this.files, function (el, i, next) {
			if (path.basename(el.dest)[0] === '_') {
				return next();
			}
			var cleanup = function() {};
			try {
				var renderOpts = {
					success: function (css, map) {
						grunt.file.write(el.dest, css);
						grunt.log.writeln('File ' + chalk.cyan(el.dest) + ' created.');

						if (map) {
							grunt.file.write(el.dest + '.map', map)
							grunt.log.writeln('File ' + chalk.cyan(el.dest + '.map') + ' created.');
						}

						cleanup();

						next();
					},
					error: function(reason) {
						grunt.warn(reason);
						cleanup();
					},
					includePaths: options.includePaths,
					outputStyle: options.outputStyle,
					sourceComments: options.sourceComments
				};

				if (el.src.length > 1) {
					var data = '@import "' + el.src.join('";\n@import "') + '";\n';
					var src = '.tmp.' + crypto.createHash('sha1').update(data).digest("hex") + '.scss';
					cleanup = function() {
						fs.unlink(src, function(err) {
							if (err) grunt.warn(err);
						});
					};
					fs.writeFileSync(src, data);
					renderOpts.file = src;
				} else {
					renderOpts.file = el.src[0];
				}

				if (options.sourceMap) {
					if (options.sourceMap === true) {
						renderOpts.sourceMap = el.dest + '.map';
					} else {
						renderOpts.sourceMap = path.resolve(cwd, options.sourceMap);
					}
				}

				sass.render(renderOpts);

			} catch(e) {
				cleanup();
				throw e;
			}
		}, this.async());
	});
};
