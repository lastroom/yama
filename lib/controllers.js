var helpers = require('./helpers');

var controllers = exports;

controllers.global = {
    paths: [],
    base: null,
    mongoose: null,
    info: {},
    templates: null
};

var renderTemplate = function(filename, args, res) {
    var swig = require('swig');
    for (var i in res.locals) {
        args[i] = res.locals[i];
    }
    swig.setDefaults({ cache: false });
    var template = swig.compileFile(controllers.global.templates + '/' + filename + '.html' || __dirname + '/../templates/' + filename + '.html');
    return res.send(template(args));
}

var Admin = require('./models.js').Admin;

var addHelpers = function(req, res) {
    res.locals.capitalizeFirstLetter = helpers.capitalizeFirstLetter;
    res.locals.base = controllers.global.base;
    res.locals.menu = controllers.global.paths;
    res.locals['isType'] = function(param, typeString) {
        return typeof(param) == typeString;
    };
    res.locals['string'] = function(param) {
        return param.toString();
    };
    res.locals['log'] = function(input) {
        console.log('INPUT:', input);
        return '';
    };
    res.locals['exists'] = function(value, values) {
        if (typeof value == typeof values) {
            return value == values;
        } else {
            if (values instanceof Array) {
                var _ = require('underscore');
                return _.find(values, function(item) {
                    if (({}).toString.call(item).match(/\s([a-zA-Z]+)/)[1].toLowerCase() == "object") {
                        return item.id == value;
                    } else {
                        return item == value;
                    }
                });
            } else {
                if (value == values.id) {
                    return value == values.id;
                } else {
                    return value == values.toString();
                }
            }
        }
    }
    res.locals['decrease'] = function(value) {
        return value - 1;
    }
    res.locals['increase'] = function(value) {
        return value + 1;
    }
    res.locals['request'] = req;
}

controllers.logout = function(req, res) {
    addHelpers(req, res);
    delete req.cookies['00lastdashboard_session00'];
    res.redirect('/admin');
}

controllers.index = function(req, res) {
    addHelpers(req, res);
    if (req.method == "post" || req.method == "POST") {
        Admin.find({
            email: req.body.email,
            password: helpers.sha1(req.body.password),
            active: true
        }, function(err, model) {
            if (err) renderTemplate('500', {}, res);
            if (model == null) {
                renderTemplate('login', {
                    error: 'Access denied'
                }, res);
            } else {
                res.cookie('00lastdashboard_session00', model.id, { maxAge: 315532800000 });
                renderTemplate('index', {}, res);
            }
        });
    } else {
        if (req.cookies['00lastdashboard_session00']) {
            renderTemplate('index', {}, res);
        } else {
            delete req.cookies['00lastdashboard_session00'];
            renderTemplate('login', {}, res);
        }
    }
}

controllers.list = function(req, res) {
    addHelpers(req, res);
    if (req.cookies['00lastdashboard_session00']) {
        var p = req.params.path,
            m = controllers.global.info[p].model,
            Model = controllers.global.mongoose.model(m);

        var page = (req.param('page') || 1) - 1;
        var perPage = req.param('perpage') || 30;
        var options = {
            perPage: perPage,
            page: page,
            meta: controllers.global.info[p]
        };

        Model.list(options, function(err, results) {
            if (err) return renderTemplate('500', {}, res);
            Model.count().exec(function(err, count) {
                renderTemplate('list', {
                    title: helpers.capitalizeFirstLetter(p),
                    list: controllers.global.info[p].list,
                    fields: controllers.global.info[p].fields,
                    data: results,
                    path: p,
                    page: page + 1,
                    pages: Math.ceil(count / perPage)
                }, res);
            });
        });
    } else {
        res.redirect('/admin');
    }
}

controllers.view = function(req, res) {
    addHelpers(req, res);
    if (req.cookies['00lastdashboard_session00']) {
        helpers.global.mongoose = controllers.global.mongoose;
        var p = req.params.path,
            id = req.params.id,
            meta = controllers.global.info[p],
            Model = controllers.global.mongoose.model(meta.model);

        Model.load(id, function(err, doc) {
            if (err) return res.redirect('404');
            helpers.processEditFields(meta, doc, function() {
                renderTemplate('view', {
                    meta: meta,
                    doc: doc,
                    path: p,
                    edit: meta.edit,
                    fields: meta.fields
                }, res);
            });
        });
    } else {
        res.redirect('/admin');
    }
}

controllers.edit = function(req, res) {
    addHelpers(req, res);
    if (req.cookies['00lastdashboard_session00']) {
        helpers.global.mongoose = controllers.global.mongoose;
        var p = req.params.path,
            id = req.params.id,
            meta = controllers.global.info[p],
            Model = controllers.global.mongoose.model(meta.model);
        Model.load(id, function(err, doc) {
            if (err) return renderTemplate('500', {
                error: err
            }, res);
            if (!doc) {
                doc = new Model({});
                var schema = Model.schema.tree;
                var fields = [];
                for(var schemaAttr in schema) {
                    if (doc[schemaAttr] == undefined && schemaAttr != '__v') {
                        doc[schemaAttr] = '';
                    }
                }
            }
            helpers.processEditFields(meta, doc, function() {
                var docObject = JSON.parse(JSON.stringify(doc));
                docObject.isNew = doc.isNew;
                renderTemplate('edit', {
                    meta: meta,
                    doc: docObject,
                    path: p,
                    edit: meta.edit,
                    fields: meta.fields
                }, res);
            });
        });
    } else {
        res.redirect('/admin');
    }
}

controllers.save = function(req, res) {
    addHelpers(req, res);
    if (req.cookies['00lastdashboard_session00']) {
        helpers.global.mongoose = controllers.global.mongoose;
        var id = req.params.id,
            p = req.params.path,
            Model = controllers.global.mongoose.model(controllers.global.info[p].model);
        Model.findOne({
            _id: id
        }, function(err, doc) {
            if (err) console.log(err);
            helpers.processFormFields(controllers.global.info[p], req.body, function() {
                if (!id) {
                    doc = new Model(req.body);
                    doc.password = '123change';
                } else {
                    helpers.updateFromObject(doc, req.body);
                }
                doc.save(function(err, result) {
                    if (err) console.log(err);
                    return res.redirect(controllers.global.base + '/' + p);
                });
            });
        });
    } else {
        res.redirect('/admin');
    }
}

controllers.del = function(req, res) {
    addHelpers(req, res);
    if (req.cookies['00lastdashboard_session00']) {
        var id = req.params.id,
            p = req.params.path,
            Model = controllers.global.mongoose.model(controllers.global.info[p].model);

        Model.findById(id).exec(function(err, model) {
            if (err) console.log(err);
            if (controllers.global.info[p].destroy) {
                model.remove(function() {
                    return res.redirect(controllers.global.base + '/' + p);
                });
            } else {
                model.active = false;
                model.save(function(err) {
                    if (err) console.log(err);
                    return res.redirect(controllers.global.base + '/' + p);
                });
            }
        });
    } else {
        res.redirect('/admin');
    }
}
