var fs = require('fs');
var helpers = require('./helpers');
var path = require('path');

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
var preloadModels = function(opts) {
    var models = opts.models || [];

    // default model
    if (opts.load_admin_model) {
        models.push(__dirname + '/models.js');
    }

    for (var i in models) {
        var currentPath = models[i];
        var stats = fs.statSync(currentPath);

        // Require model
        if (stats.isFile()) {
            require(currentPath);
        }
        // Require all models on folder
        else if (stats.isDirectory()) {
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
        app_url: opts.app_url,
        secret: secret,
        custom_css: opts.custom_css,
        custom_js: opts.custom_js
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
    //
    // YAMA initialization.
    // Parameters :
    // opts:
    // - express          : express.js application object.
    // - mongoose         : mongoose initialized object.
    // - url              : relative URI path, on which YAMA is available.
    // - app_url          : URL of the client application (used in navbar).
    // - models           : array of the models to manager. Each item can be a file (will load the model file)
    //                      or a path (will load all models files in this path).
    // - secret           : name of the secret cookie, if default authentication is used. (is_authenticated not overriden).
    // - templates        : specify a path where your templates are, if you want to override the default ones.
    // - static           : specify a path where your static CSS/JS files are, if you want to override the default ones.
    // - custom_css       : array of your custom CSS files.
    // - custom_js        : array of your custom JS files.
    // - is_authenticated : override this function with yours if you want implement a different security middleware.
    //                      e.g. : you can use a passport.js authentication, and only verify `req.user` in `is_authenticated`.
    //
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
        preloadModels(opts);

        // Default authentication using Admin users and cookie.
        // If defined in opts, this function can handle user verifiation.
        // This is an express middleware, called before each secured routes.
        if (!opts.is_authenticated || typeof(opts.is_authenticated) !== 'function') {
            opts.is_authenticated = function(req, res, next) {

                if (!req.cookies[secret]) {
                    //console.log('Not authenticated ! redirecting to login screen...');
                    return res.redirect(opts.url + '/login');
                }

                var adminId = req.cookies[secret];

                var Admin = mongoose.model('Admin');
                Admin.findById(adminId, function(err, admin) {
                    req.user = admin;
                    //console.log('user ?', req.user);
                    next();
                });
            };
            opts.default_authentication = true;
        } else {
            opts.default_authentication = false;
        }

        opts.url = opts.url || '/admin';

        var static_route = '/public' + opts.url;
        app.use(static_route, express.static(opts.static || __dirname + '/../static'));

        router(app, opts || '/admin');
    },
    //
    // Add settings of a model.
    //
    // path      : subpath for this model management screen.
    // modelName : name of the mongoose model.
    // schema    : mongoose schema object of this model.
    // opts      : JSON of options :
    // - per_page   : default number of elements per page (pager) (Default : 30).
    // - label      : title of the management page.
    // - list       : array of fields displayed on the list.
    // - filters    : array of fields available as filters.
    // - edit       : array of fields to edit.
    // - destroy    : true to remove the document from the collection when DELETE is used,
    //                false to set an active field to 0 in this document (useful for users).
    //                Default : `false`.
    // - active_field_name : Name of the field which handle the active state, if `destroy` is false.
    // - criteria   : JSON containing default criterias. Don't use the fields used in criterias as filter,
    //                to be consistent !
    //                These criterias take precedence over filters.
    // - sort|order : JSON containing the sort fields and order. (prefer `sort` to `order`).
    //                eg : `sort: {field_1: -1, field_2: 1}`
    // - fields : JSON, definition of each field.
    //     -  `field_name` :
    //            + header : label of the field.
    //            + widget : widget handling the field.
    //                        `text`     : nothing to set.
    //                        `password` : rule on save : if empty, the password won't be affected in database.
    //                        `select`   : 2 kinds of `select`.
    //                            * using `ref`    : related mongoose model.
    //                            * using `values` :
    //            + ref         : Model name. Used for specify a related collection, by its mongoose model name.
    //                            You can't use `ref` & `values` together.
    //            + values      :
    //                  - array of simple values.
    //                  - JSON `{value:..., display:...}`.
    //                  - async function : `function(field, callback){ .... callback(err, values); }`.
    //            + empty_value : Prepend this empty value to the values array. Format : `{value: xxx , display: xxx}`.
    //            + empty_value_only_for_filter : true to prepend `empty_value` only for the filter field, not on edit form.
    //            + display     : the field used to get the textual label to display.
    //            + value_field : the field used to get the value (if embedded document for example).
    //            + to_string   : function called to format this field as you want. `function(field){ ... }`
    //                            If defined, the value is rendered by template with "raw" filter, to allow HTML code.
    //                            eg : date field
    //                               ````
    //                               to_string: function(field) {
    //                                 var val = moment(field).format('L HH:mm');
    //                                 return val;
    //                               },
    //                               ````
    //                            eg : boolean field
    //                               ````
    //                               to_string: function(field) {
    //                                 if (field) return '✔';
    //                                 else return '✘';
    //                               },
    //                               ````
    //            + readonly    : true to display the value of this field on the edit form, without the possibility to change the value.
    //            + before_save : hook called before saving the document, to modify the value of the field if needed.
    // ````
    // before_save: function(fieldName, req, Model, callback) {
    //       var value = req.body[fieldName];
    //
    //       // Model is the specified model in ref setting.
    //       // You can use your own model is needed, or if your values
    //       // doesn't come from a ref, but for a values custom function.
    //       Model.findById(value, function(err, result) {
    //         if (err) callback(err);
    //
    //         if (result) {
    //           req.body[fieldName] = {
    //             _id: result._id,
    //             lib: result.lib
    //           };
    //         }
    //         callback(null, fieldName, req.body);
    //       });
    //     },
    // ````
    //            + preprocess_filter : hook called to transform the value of this field before using it as a filter in the query.
    // ````
    // var preprocess_filter_refdata = function(f, filters) {
    //   // Array of IDs => $in
    //   if (_.isArray(filters[f])) {
    //     filters[f + '._id'] = {
    //       $in: filters[f]
    //     };
    //   }
    //   // simple ID
    //   else {
    //     filters[f + '._id'] = filters[f];
    //   }

    //   delete filters[f];
    // };
    // ````
    //
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


            var populate = helpers.getPopulateString(meta.list, meta, schema);

            this.find(opts.criteria)
                .sort(opts.sort)
                .populate(populate)
                .limit(opts.per_page)
                .skip(opts.per_page * opts.page)
                .exec(function(err, collection) {
                    cb(err, collection);
                });
        };
    }
}
