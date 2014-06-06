Yet another mongoose admin
==========================

Awesome node-mongoose admin, with love from LastRoom at México to you.

## Technologies

| Server   | Client   |
|:--------:|:--------:|
|express   |Bootstrap |
|mongoose  |jQuery    |
|swig      |html5shiv |
|underscore|responseJS|
|async     |          |
|execSync  |          |

## Screenshots

![Alt tag](https://raw.githubusercontent.com/lastroom/yama/master/screenshots/Screen%20Shot%202014-06-05%20at%2018.05.19.png)

![Alt tag](https://raw.githubusercontent.com/lastroom/yama/master/screenshots/Screen%20Shot%202014-06-05%20at%2018.05.43.png)

Try the demo at: http://yamajs.com/admin

Email: demo@lastroom.mx

Password: password

## How to install

```sh
$ npm install -g yama
```

## Initialize your project admin database

```sh
$ yama init
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

var admin = require('yama');

admin.models.paths = [
    __dirname + '/models', // add the models folder to admin
    __dirname + '/models.js' // add the models file to admin
];

// Pass the mongoose app
admin.models.app = mongoose;

// Pass the express app
var app = require('express');
admin.app = app;

// If you want to create your own templates
admin.templates = __dirname + '/templates';

// If you want to create your own static files
admin.media = __dirname + '/static';

// Run admin with base url as param
admin.run('/admin');

...
//Run app at any available port
app.listen(port);
```

## Add models to admin

```javascript
var admin = require('yama');

admin.add({
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

> Ready go to your /admin and that's all

## Questions?

> Please write an issue at [https://github.com/lastroom/yama/issues](https://github.com/lastroom/yama/issues)

Inspired and based on drywal.
