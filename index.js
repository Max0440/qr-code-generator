const express = require('express');
const mongoose = require('mongoose');
const session = require('express-session');
const passport = require('passport');
const dotenv = require('dotenv/config');
const flash = require('connect-flash');
const expressEjsLayout = require('express-ejs-layouts');

//express
const app = express();

//inport passport config
require('./config/passport')(passport);

//mongoose
mongoose.set('useFindAndModify', false);
mongoose
    .connect('mongodb://localhost/' + process.env.MONGOOSE_DB_NAME, { useNewUrlParser: true, useUnifiedTopology: true })
    .then(() => console.log('connected...'))
    .catch((err) => console.log(err));

//EJS
app.set('view engine', 'ejs');
app.set('layout', 'includes/layout');
app.use(expressEjsLayout);
app.use('/assets', express.static(__dirname + '/public'));

//BodyParser
app.use(express.urlencoded({ extended: false }));

//express session
app.use(
    session({
        secret: process.env.AUTH_SECRET,
        resave: true,
        saveUninitialized: true,
    })
);
app.use(passport.initialize());
app.use(passport.session());

//use flash
app.use(flash());
app.use((req, res, next) => {
    res.locals.success_msg = req.flash('success_msg');
    res.locals.error_msg = req.flash('error_msg');
    res.locals.error = req.flash('error');
    next();
});

//routes
app.use('/', require('./routes/index'));
app.use('/users', require('./routes/users'));
app.use('/qrcode', require('./routes/qrcode'));

//404 Error
app.use((req, res) => {
    res.render('404', {
        protocol: req.protocol,
        host: req.get('host'),
        originalUrl: req.originalUrl,
    });
});

app.listen(process.env.EXPRESS_PORT);

//TODO: Error handler
//TODO: Database useFindAndModify
//TODO: write * in "QR Code"
//TODO: user can change own password
