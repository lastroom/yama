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
$ yama init --database=whatever
```

This command ask for the host, database, port, user, password, email and password.

> If you need help

```sh
$ yama --help
```

## How to implements

Finally just write the next lines:

> On your project main file add the next lines

```javascript
//Initialize express app
var express = require('express');
var app = express();

//Initialize connection to mongo
var mongoose = require('mongoose');
mongoose.connect('mongodb://host:port/database');

...

var admin = require('yama');

// Run admin with options
admin.init({
    path: process.cwd(),
    express: app,
    mongoose: mongoose,
    models: [
        process.cwd() + '/move/models'
    ],
    url: '/admin',
    templates: process.cwd() + '/admin', // Optional
    media: process.cwd() + '/static/admin' // Optional
});

...
//Run app at any available port
app.listen(port);
```

## Add models to admin

```javascript
var admin = require('yama');

admin.add('users', 'User', UserSchema, {
    label: 'My users',
    list: ['fullName', 'active'],
    edit: ['fullName', 'active', 'role', 'emails'],
    fields: {
        fullName: {
            header: 'Full name',
            widget: 'text'
        },
        active: {
            header: 'Active',
            widget: 'checkbox'
        },
        role: {
            header: 'Roles',
            ref: 'Role',
            widget: 'select',
            multiple: true,
            display: 'name'
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

## Functions

### init

> Run the admin site with options

#### Arguments

* path: process.cwd(),
* express: Express app initialized
* mongoose: Mongoose connection app
* models: Array with the routes where models are allocated
* url: url for the admin site
* templates: Admin site templates, argument optional
* media: Admin site statics, argument optional

### add

> Add an model description to the admin site

#### Arguments

* path
* modelName
* schema
* options

## Widgets

* select [aditional attributes: multiple as true or false]
* text
* textarea
* checkbox
* radio
* csv

> Ready go to your /admin and that's all

## What's next?

Three features i think would be awesome for integrate by default on yama are:

* Search filters by field
* Graphics for lists
* Order lists
* Download lists as CSV

## Questions?

> Please write an issue at [https://github.com/lastroom/yama/issues](https://github.com/lastroom/yama/issues)

Inspired and based on drywal.
