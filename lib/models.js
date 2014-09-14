module.exports = function(mongoose) {
    var Schema = mongoose.Schema,
        helpers = require('./helpers');

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

    var admin = require('./admin');
    admin.add('admins', 'Admin', AdminSchema, {
        title: 'Admins',
        label: 'Administrators',
        list: ['email', 'active'],
        edit: ['email', 'password', 'active'],
        fields: {
            email: {
                header: 'Email'
            },
            password: {
                header: 'Password',
                widget: 'password'
            },
            active: {
                header: 'Active',
                widget: 'checkbox'
            }
        }
    });

    return {
        Admin: mongoose.model('Admin', AdminSchema)
    }
}
