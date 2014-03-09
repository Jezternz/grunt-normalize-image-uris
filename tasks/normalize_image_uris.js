/*
 * grunt-normalize-image-uris
 * https://github.com/Jezternz/grunt-normalize-image-uris
 *
 * Copyright (c) 2014 JoshM
 * Licensed under the MIT license.
 */

'use strict';

var
    path = require("path"),
    fs = require("fs"),
    url = require("url");

module.exports = function(grunt) {

    // Please see the Grunt documentation for more information regarding task
    // creation: http://gruntjs.com/creating-tasks

    grunt.registerMultiTask('normalizeimageuris', 'Normalize all images URI\'s located in HTML and CSS files to point to a single image directory, also move images into this directory.', function() {
        // Merge task-specific and/or target-specific options with these defaults.
        var options = this.options({
            "validformats": ["png", "gif", "jpg", "jpeg", "bmp"]
        });

        // Iterate over all specified file groups.
        this.files.forEach(function (f)
        {
            grunt.log.writeln("\nStarting Grunt Process (Normalize image uris)...\n");

            // Destination relative url
            var relativeURI = path.join(options.newrelativeuri || f.orig.dest);
            
            // Calculate a list of all images references in files and also update image references at the same time
            var fileList = f.src.filter(function (fName) {  return !!fName; });
            if(f.cwd)
            {
                fileList = fileList.map(function (fName) { return path.normalize(path.join(f.cwd, fName)); });
            }
            var imagesAr = fileList
                .map(function (fName) { return processFileInlineImages(fName, options.validformats, relativeURI); })
                .reduce(function (a, b) { return a.concat(b); });

            // Combine any duplicates that are in multiple files + ensure appropriate extensions
            arrayEnsureUniqueEntries(imagesAr);

            // Ensure image output destination folder
            var destinationImageFolder = path.join(f.cwd, f.orig.dest);
            ensureDestinationFolder(destinationImageFolder);

            // Move all images into destination folder
            moveImages(imagesAr, destinationImageFolder);

            // Add new relative uri to images
            var newImageLocations = imagesAr.map(function (imageUri) { return path.join(relativeURI, path.basename(imageUri)); });

            // Print a success message.
            grunt.log.writeln(
                "--------Completed Grunt Process!--------\n" +
                "* " + fileList.length + " source files scanned\n" +
                "* " + imagesAr.length + " images found"
            );

        });
    });

    var arrayContains = function (ar, item) { return ar.some(function (arItem) { return arItem === item; }); };
    var arrayEnsureUniqueEntries = function (ar) { var obj = {}; ar.forEach(function (a) { obj[a] = 1; }); Array.prototype.splice.apply(ar, [0, ar.length].concat(Object.keys(obj))); }

    var processors = {
        // Different processors (Others can be added here)
        "html": {
            "extensions": ["html", "htm"],
            "fn": function (fileContent)
            {
                return [].concat(processHtmlInlineImages(fileContent), processCssInlineImages(fileContent));
            }
        },
        "css": {
            "extensions": ["css"],
            "fn": function (fileContent)
            {
                return [].concat(processCssInlineImages(fileContent));
            }
        },

        // Methods
        "extensions": function ()
        {
            var _this = this;
            return Object
                .keys(_this)
                .filter(function (k) { return typeof _this[k] === "object"; })
                .map(function (k) { return _this[k].extensions; })
                .reduce(function (a, b) { return a.concat(b); });
        },
        "processExtension": function (type, content)
        {
            var _this = this;
            return Object
                .keys(_this)
                .filter(function (k) { return typeof _this[k] === "object"; })
                .filter(function (k) { return arrayContains(_this[k].extensions, type); })
                .map(function (k) { return _this[k].fn; })
                .pop().call(_this, content);
        }
    };

    var ensureDestinationFolder = function(destinationFolder)
    {
        try
        {
            if (!fs.existsSync(destinationFolder))
            {
                fs.mkdirSync(destinationFolder);
            }
        }
        catch(er)
        {
            grunt.log.writeln("Failed to create new image directory reason(" + er + ")");
        }
    }

    var processFileInlineImages = function (fileLocation, validImages, newRelativeDir)
    {
        var ext = path.extname(fileLocation).slice(1);
        
        if (arrayContains(processors.extensions(), ext))
        {

            var fileContent = fs.readFileSync(fileLocation, { "encoding": "utf8" }), newFileContent = fileContent.slice(0);
            var imagePaths = [];
            var ignoredImages = [];
            
            try
            {
                var matchingImages = processors.processExtension(ext, fileContent);

                // filter out image uris that are empty
                matchingImages = matchingImages.filter(function (a) { return a.trim().length > 0; });

                // Filter out images with unrecognized extensions
                matchingImages = matchingImages.filter(function (a)
                {
                    var validExt = arrayContains(validImages, path.extname(a).slice(1));
                    if (!validExt)
                    {
                        ignoredImages.push(a);
                    }
                    return validExt;
                });

                // Remove duplicates
                arrayEnsureUniqueEntries(matchingImages);

                // Now ensure the uris are replaced with new ones
                matchingImages.forEach(function (imageUri)
                {
                    var newFileUri = url.resolve(newRelativeDir.replace("\\", "/"), path.basename(imageUri));
                    newFileContent = newFileContent.replace(new RegExp(imageUri, 'gim'), newFileUri);
                });

                // Write file with new replaced image uris
                fs.writeFileSync(fileLocation, newFileContent, { "encoding": 'utf8' });

                // Convert relative uris to paths (taking into consideration the relativity of the current file)
                var dirName = path.dirname(fileLocation);
                imagePaths = matchingImages.map(function (a) { return path.join(dirName, a); });

                grunt.log.writeln("[Success][ " + matchingImages.length + " Matches ] " + fileLocation);
                if (imagePaths.length > 0)
                {
                    grunt.log.writeln("[^] Found images (" + dirName + "): \n    " + imagePaths.join("\n    "));
                }
                if (ignoredImages.length > 0)
                {
                    grunt.log.writeln("[^] Ignored image extensions: \n    " + ignoredImages.join("\n    "));
                }

            }
            catch(er)
            {
                imagePaths = [];
                grunt.log.writeln("[Failure] '" + fileLocation + "' (reason: " + er + ").");
            }

            // Finally return processed list of image locations
            return imagePaths;
        }
        else
        {
            console.warn("File '" + fileLocation + "' matched but not scanned as extension was not recognized (recognized extensions are: " + processors.extensions().join(",") + ").");
            return [];
        }
    }

    var processHtmlInlineImages = function (fileContent)
    {
        var htmlImageTagMatches = fileContent.match(/<img[^>]*>/gim);
        if (htmlImageTagMatches)
        {
            return htmlImageTagMatches
                // Extract image from img tag
                .map(function (a) { return ((a.match(/src=('|")[^'"]*('|")/gim) || []).pop() || "").replace(/src=/gim, '').replace(/['"]/gim, ""); })
                // Remove empty matches
                .filter(function (a) { return a.length > 0; });
        }
        return [];
    }

    var processCssInlineImages = function (fileContent)
    {
        // Get background's that could potentially contain background
        var cssBackgroundMatches = fileContent.match(/((background:|background-image:)[^;\}]*url[^;\}]*(}|;))/gim);
        if(cssBackgroundMatches)
        {
            return cssBackgroundMatches
                .map(function (urlM)
                {
                    return (urlM.match(/url\([^\)]*\)/gim) || [])
                        .map(function (a) { return a.replace(/url/gim, '').replace(/[()'"]*/gim, ''); })
                        .filter(function (a) { return a.length > 0; });
                })
                .reduce(function(a, b) { return a.concat(b); });
        }
        return [];
    }

    // If they are not already in target dir, move images into targetdir (root)
    // Remove any folders that become empty
    var moveImages = function(imageFileAr, destinationFolder)
    {
        grunt.log.writeln("Copying images to new directories:");
        imageFileAr.forEach(function (fOldDir)
        {
            var fNewDir;
            try
            {
                fNewDir = path.normalize(path.join(destinationFolder, path.basename(fOldDir)));
                if (path.resolve(process.cwd(), fNewDir) === path.resolve(process.cwd(), fOldDir))
                {
                    // New and old are same, don't worry.
                    return;
                }
                if (!fs.existsSync(fOldDir))
                {
                    grunt.log.writeln("    [Failed - not found] " + fOldDir);
                }
                else
                {
                    fs.renameSync(fOldDir, fNewDir);

                    // if old directory is empty, remove it
                    var oldDir = path.dirname(fOldDir);
                    if(fs.readdirSync(oldDir).length === 0)
                    {
                        fs.rmdirSync(oldDir);
                    }
                }
            }
            catch(er)
            {
                grunt.log.writeln("    [Failed - not found] " + fOldDir + " reason(" + er + ")");
            }
        });
    }


};
