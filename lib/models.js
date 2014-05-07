var mongoose = require('mongoose'),
    Schema = mongoose.Schema;

var config = require(process.cwd() + '/config.js');

if (config.mongo.user) {
    mongoose.connect('mongodb://' + config.mongo.user + ':' + config.mongo.password + '@' + config.mongo.host + '/' + config.mongo.db);
} else {
    mongoose.connect('mongodb://' + config.mongo.host + '/' + config.mongo.db);
}

var helpers = require('./helpers');

var models = exports;

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

models.Admin = mongoose.model('Admin', AdminSchema);
