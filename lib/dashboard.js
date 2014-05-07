//Libraries
var express = require('express'),
    execSync = require('execSync').exec,
    path = require('path');

//Globals
var paths = [],
    info = {};

//Project helpers
var controllers = require('./controllers');

var Dashboard = exports;

var preloadModels = function() {
    for (var i in Dashboard.models.paths) {
        var currentPath = Dashboard.models.paths[i];
        if (currentPath.indexOf('.js') != -1) {
            // Require model
            require(currentPath);
        } else {
            // Require all models on folder
            var fs = require('fs');
            var models = fs.readdirSync(currentPath);
            for (var i in models) {
                if (models[i].split('.').indexOf('js') != -1) {
                    var modelPath = path.join(currentPath, models[i]);
                    require(modelPath);
                }
            }
        }
    }
};

var validate = function() {
    if (Dashboard.models.app == null) throw ""; return false;
    if (Dashboard.models.path == null) throw ""; return false;
    if (Dashboard.app == null) throw ""; return false;
    return true;
}

Dashboard.models = {
    paths: null,
    app: null,
    statics: {
        load: function(id, cb) {
            this.findById(id).select('-password').exec(cb);
        },
        list: function(options, cb) {
            var meta = options.meta;
            var criteria = meta.criteria || {};
            var order = meta.order || {};
            var list = meta.list;
            var fields = meta.fields;

            var populate = '';

            for (var i in list) {
                if (fields[list[i]].ref) {
                    populate += list[i] + ' ';
                }
            }

            populate = populate.substring(0, populate.length - 1);

            this.find(criteria)
            .populate(populate)
            .sort(order)
            .limit(options.perPage)
            .skip(options.perPage * options.page)
            .exec(function(err, collection) {
                cb(err, collection);
            });
        }
    }
};

Dashboard.app = null;

Dashboard.templates = null;

Dashboard.media = null;

Dashboard.baseUrl = null;

Dashboard.add = function(model_info) {
    paths.push(model_info.path);
    info[model_info.path] = model_info;
};

Dashboard.run = function(base) {
    if (!validate) {
        return false;
    }

    preloadModels();

    Dashboard.baseUrl = base.replace(/\/$/, "");

    controllers.global.mongoose = Dashboard.models.app;
    controllers.global.paths = paths;
    controllers.global.info = info;
    controllers.global.base = Dashboard.baseUrl;
    controllers.global.templates = Dashboard.templates;

    var app = Dashboard.app;

    // Static files
    app.use('/public/dashboard', express.static(Dashboard.media || __dirname + '/../static'));

    // routes
    app.get(Dashboard.baseUrl + '', controllers.index);
    app.get(Dashboard.baseUrl + '/', controllers.index);
    app.get(Dashboard.baseUrl + '/logout', controllers.logout);

    app.get(Dashboard.baseUrl + '/:path/:id/edit', controllers.edit);
    app.get(Dashboard.baseUrl + '/:path/new', controllers.edit);
    app.get(Dashboard.baseUrl + '/:path', controllers.list);
    app.get(Dashboard.baseUrl + '/:path/:id', controllers.view);
    app.get(Dashboard.baseUrl + '/:path/:id/delete', controllers.del);

    app.post(Dashboard.baseUrl + '', controllers.index);
    app.post(Dashboard.baseUrl + '/', controllers.index);

    app.post(Dashboard.baseUrl + '/:path/:id', controllers.save);
    app.post(Dashboard.baseUrl + '/:path', controllers.save);
}

Dashboard.initializeDB = function(dbparams, adminparams) {
    var mongoose = require('mongoose');
    var adminObject = '{"email" : "admin@lastroom.mx", "password" : "7c4a8d09ca3762af61e59520943dc26494f8941b", "_id" : ObjectId("5367f420e7d9e200009fb525"), "createdAt" : ISODate("2014-05-05T20:27:12.269Z"), "active" : true, "__v" : 0}';
    if (dbparams.user) {
        var command = 'echo \'' + adminObject + '\' | mongo ' + dbparams.db + ' --host ' + dbparams.host + ' -u ' + dbparams.user + ' -p ' + dbparams.password;
        execSync(command);
    } else {
        var command = 'echo \'' + adminObject + '\' | mongo ' + dbparams.db + ' --host ' + dbparams.host;
        execSync(command);
    }
    adminparams.active = true;
    var admin = require('./models').Admin(adminparams);
    admin.save(function(err, result) {
        if (!err) {
            console.log('Admin created successfuly');
            console.log('=========================');
            console.log('Email:', adminparams.email);
            console.log('Password:', adminparams.password);
        } else {
            console.error(err);
        }
        process.exit(0);
    });
}
