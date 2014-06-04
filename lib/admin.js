//Locals
var mongoose = null;
var paths = [];
var info = {};
var templates = null;

//Helpers
var preloadModels = function(models) {
    models.push(__dirname + '/models.js');
    for (var i in models) {
        var currentPath = models[i];
        if (currentPath.indexOf('.js') != -1) {
            // Require model
            require(currentPath);
        } else {
            // Require all models on folder
            var fs = require('fs');
            var models = fs.readdirSync(currentPath);
            for (var i in models) {
                if (models[i].indexOf('js') != -1) {
                    var modelPath = path.join(currentPath, models[i]);
                    require(modelPath);
                }
            }
        }
    }
};

var router = function(app, url) {

    var controllers = require('./controllers');
    controllers.setGlobals({
        mongoose: mongoose,
        info: info,
        templates: templates,
        paths: paths,
        url: url
    });

    // GET resources
    app.get(url, controllers.index);
    app.get(url + '/', controllers.index);
    app.get(url + '/logout', controllers.logout);

    app.get(url + '/:path/:id/edit', controllers.edit);
    app.get(url + '/:path/new', controllers.edit);
    app.get(url + '/:path', controllers.list);
    app.get(url + '/:path/:id', controllers.view);
    app.get(url + '/:path/:id/delete', controllers.del);

    // POST resources
    app.post(url + '', controllers.index);
    app.post(url + '/', controllers.index);

    app.post(url + '/:path/:id', controllers.save);
    app.post(url + '/:path', controllers.save);
}

module.exports = {
    init: function(opts) {
        var express = require('express');
        var app = opts.express;

        //Initialize express required modules
        app.use(require('body-parser')());
        app.use(require('method-override')());
        app.use(require('multer')());
        app.use(require('cookie-parser')('00__lastdashboard__00'));

        templates = opts.templates;
        mongoose = opts.mongoose || null;
        preloadModels(opts.models || []);
        var static_route = '/public' + (opts.url || '/admin');
        app.use(static_route, express.static(opts.static || __dirname + '/../static'));
        router(app, opts.url || '/admin');
    },
    add: function(path, modelName, schema, opts) {
        //Add to paths
        paths.push(path);
        opts.model = modelName;
        info[path] = opts;
        //Define statics
        schema.statics.load = function(id, cb) {
            this.findById(id).select('-password').exec(cb);
        };
        schema.statics.details = function(id, options, cb) {
            var meta = options.meta;
            var edit = meta.edit;
            var fields = meta.fields;

            var populate = '';

            for (var i in edit) {
                if (fields[edit[i]].ref) {
                    populate += edit[i] + ' ';
                }
            }

            populate = populate.substring(0, populate.length - 1);

            this.findById(id).select('-password').populate(populate).exec(cb);
        };
        schema.statics.list = function(options, cb) {
            var meta = options.meta;
            var criteria = meta.criteria || {};
            var order = meta.order || {};
            var list = meta.list;
            var fields = meta.fields;

            this.find(criteria)
            .sort(order)
            .limit(options.perPage)
            .skip(options.perPage * options.page)
            .exec(function(err, collection) {
                cb(err, collection);
            });
        };
    }
}
