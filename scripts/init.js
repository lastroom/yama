var sh = require('execSync').exec,
    crypto = require('crypto'),
    prompt = require('prompt'),
    mongo = require('mongodb'),
    mongodb = mongo.MongoClient;

module.exports = function(dbParams) {
    prompt.message = "lastdashboard";
    prompt.delimitier = "";

    prompt.start();

    prompt.get([{
        name: 'email',
        required: true,
        pattern: /[a-z0-9._%+-]+@[a-z0-9.-]+\.[a-z]{2,3}/,
        description: 'Enter the admin email',
        message: 'Email invalid',
    }, {
        name: 'password',
        description: 'Enter the admin password',
        hidden: true,
        required: true
    }], function (err, result) {
        if (err) process.exit(0);
        var email = result.email;
        var password = crypto.createHash('sha1').update(result.password);
        var adminObject = {
            email : email,
            password: password.digest('hex'),
            active : true
        };
        mongodb.connect('mongodb://' + dbParams.host + ':' + dbParams.port + '/' + dbParams.database, function(err, db) {
            db.collection('admins').find({
                email: email
            }).toArray(function(err, admins) {
                if (admins.length > 0) {
                    console.error('Admin already registered');
                    process.exit(0);
                } else {
                    db.collection('admins').insert(adminObject, function(err, objects) {
                        if (err) {
                            throw err;
                        }
                        console.log('Admin created successfuly');
                        console.log('=========================');
                        console.log('Email:', email);
                        console.log('Password:', result.password);
                        process.exit(0);
                    });
                }
            });
        });
    });
};