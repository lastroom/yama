var path = require('path');
var helpers = require('./helpers');

//Locals
var paths = [],
    info = {},
    secret,
    mongoose,
    templates;

var alphanumeric = function(length) {
    var m = length || 6,
        s = '',
        r = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
    for (var i = 0; i < m; i++) {
        s += r.charAt(Math.floor(Math.random() * r.length));
    }
    return s;
};

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
            var modelsList = fs.readdirSync(currentPath);
            for (var j in modelsList) {
                if (modelsList[j].indexOf('js') != -1) {
                    var modelPath = path.join(currentPath, modelsList[j]);
                    require(modelPath);
                }
            }
        }
    }
};

var router = function(app, opts) {

    var controllers = require('./controllers');
    controllers.setGlobals({
        mongoose: mongoose,
        info: info,
        templates: templates,
        paths: paths,
        url: opts.url,
        secret: secret
    });

    // GET resources

    //app.get(opts.url + '/', controllers.index);
    app.get(opts.url, opts.is_authenticated, controllers.index);

    // Unauthenticated routes
    if (opts.default_authentication) {
        app.get(opts.url + '/login', controllers.login);
        app.post(opts.url + '/login', controllers.login);

        app.get(opts.url + '/logout', controllers.logout);
    }

    // Secured routes
    // Dashboard
    app.get(opts.url + '/:path/:id/edit', opts.is_authenticated, controllers.edit);
    app.get(opts.url + '/:path/new', opts.is_authenticated, controllers.edit);
    app.get(opts.url + '/:path', opts.is_authenticated, controllers.list);
    app.get(opts.url + '/:path/:id', opts.is_authenticated, controllers.view);
    app.get(opts.url + '/:path/:id/delete', opts.is_authenticated, controllers.del);

    // POST resources
    app.post(opts.url + '/:path/:id', opts.is_authenticated, controllers.save);
    app.post(opts.url + '/:path', opts.is_authenticated, controllers.save);
};

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
        secret = opts.secret || alphanumeric(30) + Date.now();
        mongoose = opts.mongoose || null;
        preloadModels(opts.models || []);

        // Default authentication using Admin users and cookie.
        // If defined in opts, this function can handle user verifiation.
        // This is an express middleware, called before each secured routes.
        if (!opts.is_authenticated || typeof(opts.is_authenticated) !== 'function') {
            opts.is_authenticated = function(req, res, next) {

                console.log('cookies ?', req.cookies);

                if (!req.cookies[secret]) {
                    console.log('Not authenticated ! redirecting to login screen...');
                    return res.redirect(opts.url + '/login');
                }

                var adminId = req.cookies[secret];

                //var models = require('./models.js')(mongoose);

                var Admin = mongoose.model('Admin');
                Admin.findById(adminId, function(err, admin) {
                    req.user = admin;
                    console.log('user ?', req.user);
                    next();
                });
            };
            opts.default_authentication = true;
        } else {
            opts.default_authentication = false;
        }

        var static_route = '/public' + (opts.url || '/admin');
        app.use(static_route, express.static(opts.static || __dirname + '/../static'));

        router(app, opts || '/admin');
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
        schema.statics.details = function(id, opts, cb) {
            var meta = opts.meta;

            var populate = helpers.getPopulateString(meta.edit, meta, schema);

            this.findById(id).select('-password').populate(populate).exec(cb);
        };
        schema.statics.list = function(opts, cb) {
            var meta = opts.meta;
            var criteria = meta.criteria || {};
            var order = meta.order || {};


            var populate = helpers.getPopulateString(meta.list, meta, schema);

            this.find(criteria)
                .sort(order)
                .populate(populate)
                .limit(opts.perPage)
                .skip(opts.perPage * opts.page)
                .exec(function(err, collection) {
                    cb(err, collection);
                });
        };
    }
}