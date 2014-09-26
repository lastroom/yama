var _ = require('underscore');
var fs = require('fs');

var helpers = require('./helpers'),
    controllers = module.exports,
    // globals contains admin.init() options.
    globals = {};

//
// Maps helpers to the templates.
//
var addHelpers = function(req, res) {
    res.locals.capitalizeFirstLetter = helpers.capitalizeFirstLetter;
    res.locals.staticUrl = '/public' + globals.url;
    res.locals.custom_css = globals.custom_css;
    res.locals.custom_js = globals.custom_js;
    res.locals.base = globals.url;
    res.locals.menu = globals.paths;

    res.locals['mapData'] = function(object, ref, token) {
        if (ref && ref.indexOf('.') != -1) {
            var parts = ref.split(token);
            var get = function(context, variable, rest) {
                if (!context) {
                    return "";
                }
                if (context || context[variable]) {
                    if (rest.length > 0) {
                        return get(context[variable], _.first(rest), _.rest(rest)) || "";
                    } else {
                        var result = context[variable];
                        return (_.isFunction(result) ? result.call(null) : result) || "";
                    }
                } else {
                    return "";
                }
            }
            object[ref] = get(object, _.first(parts), _.rest(parts));
        }
        return "";
    };
    res.locals['mapName'] = function(ref, token) {
        if (ref.indexOf('.') != -1) {
            var parts = ref.split('.');
            var name = parts[0];
            for (var i = 1; i < parts.length; i++) {
                name += '[' + parts[i] + ']';
            }
            return name;
        }
        return ref;
    }
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

var renderTemplate = function(filename, args, res) {
    var swig = require('swig');
    for (var i in res.locals) {
        args[i] = res.locals[i];
    }
    swig.setDefaults({
        cache: false
    });
    var template = null,
        tplfile;

    if (globals.templates) {
        tplfile = globals.templates + '/' + filename + '.html';

        // get default template if not found
        if (!fs.existsSync(tplfile)) {
            tplfile = __dirname + '/../templates/' + filename + '.html';
        }
    } else {
        tplfile = __dirname + '/../templates/' + filename + '.html';
    }

    template = swig.compileFile(tplfile);

    //console.log('rendering... ', tplfile);

    return res.send(template(args));
};

controllers.setGlobals = function(opts) {
    globals = opts;
    helpers.setGlobals(globals);
};

//
// Index/login
//
controllers.index = function(req, res) {
    addHelpers(req, res);
    renderTemplate('index', {}, res);
};

// List completed
controllers.list = function(req, res) {

    addHelpers(req, res);
    //if (req.cookies[globals.secret]) {
    if (req.user) {
        var p = req.params.path,
            // YAMA field settings
            meta = globals.info[p],
            Model = globals.mongoose.model(meta.model);


        var page = (req.param('page') || 1) - 1;
        var perPage = req.param('perpage') || meta.per_page || 30;
        var options = {
            per_page: perPage,
            page: page,
            meta: meta
        };

        _.each(meta.fields, function(f, key) {
            if (!f.header) {
                f.header = key;
            }
        });


        // -----------
        // filters handling
        if (meta.filters) {
            helpers.setGlobals(globals);

            // preparing form fields
            //console.log('processEditFields');
            helpers.processEditFields(meta, null, function() {
                //console.log('=> processEditFields OK');
            });


            // process GET parameters...
            //console.log('processFormFields');
            helpers.processFormFields(meta, req, req.query, function(err) {
                if (err) {
                    console.error(err);
                    return;
                }

                helpers.parseJSON(req.query);

                //console.log('=> processFormFields OK');
            });
        }
        // -----------

        //console.log('list');
        options.criteria = helpers.processFilters(req.query, meta);

        options.sort = {};
        if (req.query.sort_by) {
            options.sort[req.query.sort_by] = parseInt(req.query.order);
        }
        // Default sorting.
        else {
            options.sort = meta.order || meta.sort || {};
        }


        //console.log('List : criteria =', options.criteria, ', sort =', options.sort);


        Model.list(options, function(err, results) {
            if (err) return renderTemplate('500', {}, res);
            // Use to_string functions if exist to transform displayed values.
            results.forEach(function(doc, i) {
                results[i] = helpers.prepareDocToDisplay(doc, meta);
            });

            //console.log('=> list OK');
            //console.log(results);

            Model.count(options.criteria).exec(function(err, count) {
                renderTemplate('list', {
                    title: helpers.capitalizeFirstLetter(meta.label),
                    meta: meta,
                    list: meta.list || [],
                    filters: meta.filters || [],
                    fields: meta.fields || [],
                    data: results,
                    query: req.query,
                    order: options.order,
                    path: p,
                    page: page + 1,
                    perPage: perPage,
                    pages: Math.ceil(count / perPage)
                }, res);
            });
        });
    } else {
        res.redirect(globals.url);
    }
};

controllers.save = function(req, res) {
    addHelpers(req, res);
    if (req.user) {
        helpers.setGlobals(globals);
        var id = req.params.id,
            p = req.params.path,
            Model = globals.mongoose.model(globals.info[p].model);


        Model.findOne({
            _id: id
        }, function(err, doc) {
            if (err) console.error(err);
            helpers.processFormFields(globals.info[p], req, req.body, function(err) {
                if (err) {
                    console.error(err);
                    return;
                }

                if (!id) {
                    doc = new Model(req.body);
                    doc.password = '123change';
                } else {
                    helpers.parseJSON(req.body);
                    helpers.updateFromObject(doc, req.body);
                }

                //console.log('BEFORE SAVE', req.body, '---------', doc);

                doc.save(function(err, result) {
                    if (err) console.error(err);
                    return res.redirect(globals.url + '/' + p);
                });
            });
        });
    } else {
        res.redirect(globals.url);
    }
};

controllers.view = function(req, res) {
    addHelpers(req, res);
    if (req.user) {
        helpers.setGlobals(globals);
        var p = req.params.path,
            id = req.params.id,
            meta = globals.info[p],
            Model = globals.mongoose.model(meta.model);

        var options = {
            meta: meta
        };

        Model.details(id, options, function(err, doc) {
            if (err) return res.redirect('404');

            doc = helpers.prepareDocToDisplay(doc, meta);

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
};

controllers.edit = function(req, res) {
    addHelpers(req, res);
    if (req.user) {
        var p = req.params.path,
            id = req.params.id,
            meta = globals.info[p],
            Model = globals.mongoose.models[meta.model];

        var options = {
            meta: meta
        };

        // "details" called, to populate fields if necessary,
        // for readonly fields, to get corresponding label of a value.
        Model.details(id, options, function(err, doc) {

            //console.log(doc);
            if (err) return renderTemplate('500', {
                error: err
            }, res);
            if (!doc) {
                doc = new Model({});
                var schema = Model.schema.tree;
                //var fields = [];
                for (var schemaAttr in schema) {
                    if (doc[schemaAttr] == undefined && schemaAttr != '__v') {
                        doc[schemaAttr] = '';
                    }
                }
            }
            helpers.processEditFields(meta, doc, function() {
                var docObject = JSON.parse(JSON.stringify(doc));


                docObject.isNew = doc.isNew;

                // console.log('docObject: ', docObject);
                // console.log('meta:', meta);

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
};

controllers.del = function(req, res) {
    addHelpers(req, res);
    if (req.user) {
        var id = req.params.id,
            p = req.params.path,
            Model = globals.mongoose.model(globals.info[p].model);


        Model.findById(id).exec(function(err, model) {
            if (err) console.error(err);
            if (globals.info[p].destroy) {
                model.remove(function() {
                    return res.redirect(globals.url + '/' + p);
                });
            } else {

                var activeFieldName = globals.info[p].active_field_name || 'active';

                model.set(activeFieldName, false);
                model.save(function(err) {
                    if (err) console.error(err);
                    return res.redirect(globals.url + '/' + p);
                });
            }
        });
    } else {
        res.redirect(globals.url);
    }
};



//
// Login screen if default authentication is used.
//
controllers.login = function(req, res) {
    addHelpers(req, res);
    if (req.method.toLowerCase() == "post") {
        var models = require('./models.js')(globals.mongoose);
        var Admin = models.Admin;
        Admin.findOne({
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
                res.cookie(globals.secret, model._id, {
                    maxAge: 315532800000
                });
                renderTemplate('index', {}, res);
            }
        });
    } else {
        if (req.user) {
            renderTemplate('index', {}, res);
        } else {
            delete req.cookies[globals.secret];
            renderTemplate('login', {}, res);
        }
    }
};

//
// Logout action if default authentication is used.
//
controllers.logout = function(req, res) {
    addHelpers(req, res);
    res.clearCookie(globals.secret);
    res.redirect(globals.url);
};