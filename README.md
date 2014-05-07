Last Dashboard
=============

Awesome node dashboard, with love from LastRoom at México to you.

## Technologies

| Server   | Client   |
|:--------:|:--------:|
|express   |Bootstrap |
|mongoose  |jQuery    |
|swig      |html5shiv |
|underscore|responseJS|
|async     |          |
|execSync  |          |

## How to install

> On your project directory install the node module as follows:

```sh
$ npm install lastdashboard
```

## How to create the first admin

> for create the first admin, just create a file **dashboardinit.js** with the content below

```javascript
#!/usr/bin/env node

var dashboard = require('lastdashboard');

dashboard.initializeDB({
        host: "myhost",
        db:"mydatabase"
    }, {
        email: "admin@mycompany.com",
        password: "passphrase"
    });
```

> Add this script to your package.json, on scripts section, as follows

```json
  ...
  "scripts": {
     "dashboard": "./dashboardinit.js"
  }
```

> Give execution permissions to this script:

```sh
$ chmod +x dashboardinit.js
```

> Now run the script with npm

```sh
$ npm run-script dashboard
```

> You got it, your admin has been created, now just implement

## How to initialize

> First create a file named config.js on the project root folder with this content:

```javascript
module.exports = require('./config/' + (process.env.NODE_ENV || 'development') + '.js');
```

> Then create a folder called config and write inside this new folder two files **development.json** and **production.json**.

> Fill both files with this content

```json
module.exports = {
    mongo: {
        "host": "myhost",
        "db": "mydb"
    }
}
```

Other arguments are user, password and port, but for this example we don't need them.

> On your project main file add the next lines

```javascript
var app = express();

...

var dashboard = require('lastdashboard');

dashboard.models.paths = [
    __dirname + '/models', // add the models folder to dashboard
    __dirname + '/models.js' // add the models file to dashboard
];

// Pass the mongoose app
var mongoose = require('mongoose');
dashboard.models.app = mongoose;

// Pass the express app
var app = require('express');
dashboard.app = app;

// If you want to create your own templates
dashboard.templates = __dirname + '/templates';

// If you want to create your own static files
dashboard.media = __dirname + '/static';

// Run dashboard with base url as param
dashboard.run('/dashboard');

...

app.listen(9999);
```

## Add models to dashboard

> First add statics methods to your mongoose schema

```javascript

var dashboard = require('lastdashboard');
AppSchema.statics = dashboard.models.statics;
```

**NOTE:** *dashboard.models.statics* contains to methods *list* and *load*, that are needed for the dashboard. If you want to custom them, just rewrite them on the schema definition:

```
AppSchema.statics = {
    load: function(id, cb) {
        this.findById(id, cb);
    },
    list: function(options, cb) {
        var meta = options.meta;
        var criteria = meta.criteria || {};
        var order = meta.order || {};
        var list = meta.list;
        var fields = meta.fields;

        this.find(criteria)
        .sort(order)
        .limit(options.perPage)
        .skip(options.perPage * options.page)
        .exec(function(err, collection) {
            cb(err, collection);
        });
    }
}
```

> Then add the model to dashboard

```javascript
dashboard.add({
    path: 'apps',
    model: 'App',
    list: [ 'name', 'description', 'active' ],
    edit: [ 'name', 'description', 'active' ],
    fields: {
        'name': {
            header: 'App name',
            link: true
        },
        'description': {
            header: 'Description'
        }
        'active': {
            header: 'Active',
            widget: 'checkbox'
        },
        emails: {
            header: 'Emails',
            widget: 'csv',
            placeholder: 'Type an email...',
            pattern: '^([a-zA-Z0-9_.-])+@(([a-zA-Z0-9-])+\.)+([a-zA-Z0-9]{2,4})+$'
        }
    },
    order: { //The attributes to order the results.
        createdAt: 1,
        active: 1
    },
    criteria: { //The attributes to decide what to show and what don't.
        active: true
    }
});
```

> Ready go to your /dashboard and that's all

## Questions?

> Please write an issue at [https://github.com/lastroom/lastdashboard/issues](https://github.com/lastroom/lastdashboard/issues)
