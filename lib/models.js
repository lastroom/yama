module.exports = function(mongoose) {
    var Schema = mongoose.Schema;

    var helpers = require('./helpers');

    var AdminSchema = new Schema({
        email: {
            type: String,
            validate: /^([\w-\.]+@([\w-]+\.)+[\w-]{2,})?$/,
            unique: true,
            required: true
        },
        password: {
            type: String,
            required: true
        },
        active: {
            type: Boolean,
            default: false
        },
        createdAt: {
            type: Date,
            default: Date.now
        },
        updatedAt: {
            type: Date
        }
    }, {
        collection: 'admins'
    });

    AdminSchema.pre('save', function(save) {
        this.updatedAt = Date.now;
        if (this.isModified('password')) {
            this.password = helpers.sha1(this.password);
        }
        save();
    });

    AdminSchema.statics = {
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

    return {
        Admin: mongoose.model('Admin', AdminSchema)
    }
}
