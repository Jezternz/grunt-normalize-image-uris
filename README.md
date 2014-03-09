# grunt-normalize-image-uris

> This grunt plugin allows you to select HTML & CSS Files (or directories) and then will scan these files for images. At present this means < img src="" > for html files and background: url() or background-image: url() for css and html files. The plugin will then update all image URLs with a new URL destination, the plugin will then find all these images and move them to their new location.

> Why would you want to do this? Say you want to minify css + combine all your images to make sprites, but they are spread out across all kinds of vendor folders in css files scattered all over the place. Running this plugin first will update all your css files, move the images, ready for both CSS minification + Sprite plugins to do their thing.

> *Note Typically this should be run before CSS Minification + Before Image spriting.

## Getting Started
This plugin requires Grunt `~0.4.2`

If you haven't used [Grunt](http://gruntjs.com/) before, be sure to check out the [Getting Started](http://gruntjs.com/getting-started) guide, as it explains how to create a [Gruntfile](http://gruntjs.com/sample-gruntfile) as well as install and use Grunt plugins. Once you're familiar with that process, you may install this plugin with this command:

```shell
npm install grunt-normalize-image-uris --save-dev
```

Once the plugin has been installed, it may be enabled inside your Gruntfile with this line of JavaScript:

```js
grunt.loadNpmTasks('grunt-normalize-image-uris');
```

## The "normalize_image_uris" task

### Overview
In your project's Gruntfile, add a section named `normalize_image_uris` to the data object passed into `grunt.initConfig()`.

```js
grunt.initConfig({
  normalize_image_uris: {
    options: {
      "validformats": ["png", "gif", "jpg", "jpeg", "bmp"]
    },
    "files":[]
  },
});
```

### Options

#### options.validformats
Type: `Array`
Default value: `["png", "gif", "jpg", "jpeg", "bmp"]`

An array of image extensions to match against.

### Usage Examples

#### Default Options
In this example, all css and htm files inside "temp/" are scanned, all the image uris are replaced with "images/{image-name}", the actual image files are moved into the images/ folder...

```js
grunt.initConfig({
  normalize_image_uris: {
    "files":[{ "cwd": "temp/", "src": ["**/**/*.css", "**/**/*.htm"], "dest": "images/"}]
  }
});
```

## Release History
0.1 - Initial commit
