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

```sh
$ npm install -g lastdashboard
```

## Initialize your project dashboard database

```sh
$ lastdashboard init
```

This command ask for the host, database, port, user, password, email and password.

## How to implements

Finally just write the next lines:

> On your project main file add the next lines

```javascript
//Initialize express app
var app = express();

//Initialize connection to mongo
var mongoose = require('mongoose');
mongoose.connect('mongodb://host:port/database');

...

var dashboard = require('lastdashboard');

dashboard.models.paths = [
    __dirname + '/models', // add the models folder to dashboard
    __dirname + '/models.js' // add the models file to dashboard
];

// Pass the mongoose app
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
//Run app at any available port
app.listen(port);
```

## Add models to dashboard

```javascript
var dashboard = require('lastdashboard');

dashboard.add({
    model: 'User',
    exclude: [], //Fields exclude fields from model.
    fields: [], //Fields to include from model.
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


Inspired and based on drywal.
