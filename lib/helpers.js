var _ = require('underscore'),
    helpers = module.exports,
    globals = {};

helpers.setGlobals = function(opts) {
    globals = opts;
};

helpers.parseJSON = function(object) {
    var set = function(context, variable, rest, value) {
        if (!_.has(context, variable)) {
            context[variable] = {};
        }
        if (rest.length > 0) {
            set(context[variable], _.first(rest), _.rest(rest), value);
        } else {
            context[variable] = value;
        }
    }
    for (var i in object) {
        if (i.indexOf('[') != -1) {
            var parts = i.replace(/\]/gi, '').replace(/\[/gi, '.').split('.');
            set(object, _.first(parts), _.rest(parts), object[i]);
            delete object[i];
        }
    }
}

helpers.sha1 = function(string) {
    var crypto = require('crypto');
    var shasum = crypto.createHash('sha1').update(string);
    return shasum.digest('hex');
}

helpers.capitalizeFirstLetter = function(string) {
    return string.charAt(0).toUpperCase() + string.slice(1);
}

helpers.updateFromObject = function(doc, obj) {
    for (var field in obj) {
        if (field == 'password') {
            if (obj[field] != "") doc[field] = obj[field];
        } else {
            doc[field] = obj[field];
        }
    }
}

helpers.getType = function(obj) {
    return ({}).toString.call(obj).match(/\s([a-zA-Z]+)/)[1].toLowerCase();
}

helpers.processEditFields = function(meta, doc, cb) {
    var f, Model, field,
        fields = [],
        count = 0; // ToDo: change this to an array of fields to process

    for (f in meta.edit) {
        if (meta.fields[meta.edit[f]].ref) {
            count++;
            fields.push(meta.edit[f]);
        }
    }

    if (!count) {
        return cb();
    }

    var fieldProcesses = [];

    for (f in fields) {
        field = meta.fields[fields[f]];
        Model = globals.mongoose.model(field.ref);
        fieldProcesses.push({
            field: field,
            model: Model
        });
    }

    var async = require('async');

    async.eachLimit(fieldProcesses, 20, function(item, done) {
        item.model.find({}, item.field.display, { sort: item.field.display }, function(err, results) {
            if (err) done();
            item.field['values'] = results.map(function(e) {
                return {
                    display: e[item.field.display] + '',
                    value: e['id'] + ''
                };
            });
            done();
        });
    }, function(err) {
        if (err) console.error(err);
        cb();
    });

}

helpers.processFormFields = function(meta, body, cb, isNew) {
    var f, field, Model,
        query = {},
        fields = [],
        count = 0;

    for (f in meta.edit) {
        if (meta.fields[meta.edit[f]].widget == 'ref') {
            fields.push(meta.edit[f]);
            count++;
        }
    }

    if (!count) {
        return cb();
    }

    for (f in fields) {
        field = meta.fields[fields[f]];
        Model = globals.mongoose.model(field.model);
        var widget = meta.fields[fields[f]].widget;
        if (!isNew && meta.fields[fields[f]].ref) {
            if (!body[fields[f]]) {
                body[fields[f]] = [];
            }
            if (body[fields[f]] == "") {
                delete body[fields[f]];
            }
            count--;
            if (count == 0) {
                return cb();
            }
        } else {
            query[field.field] = body[fields[f]];
            Model.findById(body[fields[f]], function(err, ref) {
                if (err) console.error(err);
                body[field.field] = ref['_id'];
                count--;
                if (count == 0) {
                    return cb();
                }
            });
        }
    }
}

//
// Get embedded field of a JSON, with dot notation.
// Parameters :
//   - obj : the JSON object.
//   - str : field to get, in a "dot notation" format.
//
// see http://stackoverflow.com/questions/10934664/convert-string-in-dot-notation-to-get-the-object-reference
//
// ````
// var obj = { a: { b: 1, c : { d : 3, e : 4}, f: 5 } }
// str = 'a.c.d'
// ref(obj, str) // 3
// ````
//
helpers.ref = function(obj, str) {
    return str.split(".").reduce(function(o, x) { return o[x] }, obj);
}