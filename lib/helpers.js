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
        // Avoid empty password.
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

helpers.prepareDocToDisplay = function(doc, metas) {
    // we need to cast to JSON.
    // but we want to keep id information (virtual getter).
    var id = doc.id;
    doc = doc.toJSON();
    doc.id = id;

    for (var f in doc) {
        if (metas.fields[f] && typeof(metas.fields[f].to_string) === 'function') {
            doc[f] = metas.fields[f].to_string(doc[f]);
        }
    }

    return doc;
};

//
// Prepare form fields.
//
// - meta : YAMA init options.
// - doc : ??? is never used.
// - cb : callback : `function(err){}`
//
helpers.processEditFields = function(meta, doc, cb) {
    var f, fieldsRef = [],
        fieldsNeedingValues = [];

    // union of edit and list, because list has now filters form as well.
    for (f in _.union(meta.edit, meta.list)) {
        if (meta.fields[meta.edit[f]].widget === 'ref' || meta.fields[meta.edit[f]].ref) {
            fieldsRef.push(meta.edit[f]);
        }
    }

    for (f in _.union(meta.edit, meta.list)) {
        if (typeof(meta.fields[meta.edit[f]].values) === 'function') {
            fieldsNeedingValues.push(meta.edit[f]);
        }
    }


    if (fieldsRef.length === 0 && fieldsNeedingValues.length === 0) {
        return cb(null);
    }


    // ------------------------
    // Processing fields which use `select` wdiget.
    // needing values found in a related collection, using the `ref` setting.
    // ------------------------
    var fieldProcesses = [];

    for (f in fieldsRef) {
        var field = meta.fields[fieldsRef[f]];

        // the "ref" fields needs model to get values from the other collection.
        fieldProcesses.push({
            field: field,
            model: globals.mongoose.model(field.ref)
        });
    }

    for (f in fieldsNeedingValues) {
        var field = meta.fields[fieldsNeedingValues[f]];
        var valuesFunc = meta.fields[fieldsNeedingValues[f]].values;

        // the fields using a custom function to get the values.
        fieldProcesses.push({
            field: field,
            get_values: valuesFunc
        });
    }


    var async = require('async');


    async.eachLimit(fieldProcesses, 20, function(item, done) {
        if (item.model) {
            // Gets all value of a "select"/"ref" field.
            // For each values :
            // - value = _id
            // - label = get via "display" field.
            item.model.find({}, item.field.display, {
                sort: item.field.display
            }, function(err, results) {
                if (err) return done(err);

                item.field.values = results.map(function(e) {
                    return {
                        display: e[item.field.display] + '',
                        value: e.id + ''
                    };
                });

                if (!item.field.values)
                    item.field.values = [];

                // Preprend the empty value if necessary.
                if (item.field.empty_value) {
                    item.field.values.unshift(item.field.empty_value);
                }

                done(null);
            });
        } else if (item.get_values) {

            item.get_values(item.field, function(err, values) {
                if (err) return done(err);

                // here, we replace the "values" function by the real values.
                item.field.values = values;

                done(null);
            });
        }
    }, function(err) {
        if (err) return cb(err);

        // called when all done() have been called.
        cb(null);
    });

};

//
// Process fiels before save.
//
// meta : all fields and YAMA settings.
// req  : HTTP request.
// values : values from query or body (repectively filters or saving).
// cb   : callback called after this function terminates his job.
// isNew : ?? never used :(
//
helpers.processFormFields = function(meta, req, values, cb, isNew) {
    var f, metaField, Model, fieldName,
        //query = {},
        fields = [],
        count = 0;

    for (f in meta.edit) {
        // if "ref with mongoose's populate" field or "select from model" field
        if (meta.fields[meta.edit[f]].widget === 'ref' || meta.fields[meta.edit[f]].ref) {
            fields.push(meta.edit[f]);
            count++;
        }
    }

    if (!count) {
        return cb();
    }


    for (f in fields) {
        fieldName = fields[f];

        metaField = meta.fields[fieldName];

        if (metaField.model)
            Model = globals.mongoose.model(metaField.model);
        else if (metaField.ref)
            Model = globals.mongoose.model(metaField.ref);

        //var widget = meta.fields[fieldName].widget;
        if (!isNew) {

            //console.log('body[%s] : %s', fieldName, body[fieldName]);

            // if `before_save` middleware is defined in settings,
            // it takes the precedence.
            if (metaField.before_save && typeof(metaField.before_save) === 'function') {
                metaField.before_save(fieldName, req, Model, function(err, fname, values) {
                    if (err) {
                        console.log('Error in before_save of field %s', fname, ', values:', values, ', error:', err);
                        return cb(err);
                    }

                    count--;
                    if (count === 0) {
                        return cb();
                    }
                });
            } else if (!values[fieldName]) {
                values[fieldName] = [];


                count--;
                if (count === 0) {
                    return cb();
                }
            } else if (values[fieldName] === "") {
                delete values[fieldName];


                count--;
                if (count === 0) {
                    return cb();
                }
            }


        }
        // kind of validator ?
        // never called because isNew is never used.
        else {
            // query[field.field] = body[fieldName];

            Model.findById(values[fieldName], function(err, ref) {
                if (err) console.error(err);
                values[field.field] = ref._id;
                count--;
                if (count === 0) {
                    return cb();
                }
            });
        }
    }
};

helpers.processFilters = function(queryFilters, meta) {

    var filters = {};

    delete filters.page;
    delete filters.perpage;

    // Epurates not wanted filters
    _.each(meta.filters, function(f) {
        if (queryFilters.hasOwnProperty(f)) {
            if (queryFilters[f] !== null & queryFilters[f].length !== 0 && queryFilters[f] !== false && queryFilters[f] !== 'false') {
                filters[f] = queryFilters[f];

                // Preprocess filter if needed.
                if (meta.fields[f].preprocess_filter && typeof(meta.fields[f].preprocess_filter) === 'function') {
                    meta.fields[f].preprocess_filter(f, filters);
                }
            }
        }
    });


    // Merging default criteria with filters.
    // Default ones take precedence, for security reason.
    filters = _.extend(filters, meta.criteria);

    return filters;
};

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
    return str.split(".").reduce(function(o, x) {
        return o[x];
    }, obj);
};

// Generates populate string to give to the `populate()` function of mongoose.
helpers.getPopulateString = function(listOfFields, meta, schema) {
    var fields = meta.fields;

    var populate = '';
    for (var i in listOfFields) {
        var field_name = listOfFields[i];

        // If the schema of the field use "ref", it has to be populated.
        if (fields[field_name] && fields[field_name].ref) {
            var fieldSchema = schema.path(field_name);
            // if a "ref" option is defined in the schema for this field.
            if (fieldSchema && fieldSchema.options && fieldSchema.options.ref) {
                populate += field_name + ' ';
            }
        }
    }
    return populate.substring(0, populate.length - 1);
};