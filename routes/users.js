const express = require('express');
const bcrypt = require('bcrypt');
const joi = require('joi');
const passport = require('passport');
const { ensureAuthenticated } = require('../config/auth.js');

const User = require('../models/users');
const { version } = require('mongoose');

const router = express.Router();

//main page
router.get('/', ensureAuthenticated, (req, res) => {
    res.render('users/panel', {
        user: req.user,
    });
});

//login page
router.get('/login', (req, res) => {
    if (req.user) {
        req.flash('error_msg', 'You are already logged in');
        res.redirect('/');
    } else {
        res.render('users/login', {
            user: req.user,
        });
    }
});

//register page
router.get('/register', (req, res) => {
    if (req.user) {
        req.flash('error_msg', 'You are already logged in');
        res.redirect('/');
    } else {
        res.render('users/register', {
            user: req.user,
        });
    }
});

//update userdata page
router.get('/update', ensureAuthenticated, (req, res) => {
    res.render('users/update', {
        user: req.user,
    });
});

//update password page
router.get('/updatePasswd', ensureAuthenticated, (req, res) => {
    res.render('users/updatePasswd', {
        user: req.user,
    });
});

//login handler
router.post('/login', (req, res, next) => {
    passport.authenticate('local', {
        successRedirect: '/',
        failureRedirect: '/users/login',
        failureFlash: true,
    })(req, res, next);
});

//register handler
router.post('/register', async (req, res) => {
    const { name, username, email, password, password2 } = req.body;
    let errors = [];

    //validate data
    let newJoiSchema = joi.object({
        name: joi.string().max(255).required(),
        username: joi.string().alphanum().max(255).required(),
        email: joi.string().max(255).email().required(),
        password: joi.string().min(6).max(255).required(),
        password2: joi.ref('password'),
    });

    let validData = newJoiSchema.validate({ name: name, username: username, email: email, password: password, password2: password2 });

    if (validData.error) {
        errors.push({ msg: validData.error.details[0].message });
    }

    //push errors
    if (errors.length > 0) {
        res.render('users/register', {
            errors: errors,
            name: name,
            username: username,
            email: email,
            password: password,
            password2: password2,
            user: req.user,
        });
        return;
    }

    //check if userer already registerd
    try {
        var emailFound = await User.findOne({ email: email }).exec();
        var usernameFound = await User.findOne({ username: username }).exec();
    } catch (e) {
        console.error(e);
    }

    if (emailFound) {
        errors.push({ msg: 'Email already registerd' });
        res.render('users/register', {
            errors: errors,
            name: name,
            username: username,
            password: password,
            password2: password2,
            user: req.user,
        });
        return;
    }

    if (usernameFound) {
        errors.push({ msg: 'Username already registerd' });
        res.render('users/register', {
            errors: errors,
            name: name,
            email: email,
            password: password,
            password2: password2,
            user: req.user,
        });
        return;
    }

    //add user to db
    const newUser = new User({
        name: name,
        username: username,
        email: email,
        password: password,
        qrcodes: [],
    });

    //hash password
    bcrypt.hash(newUser.password, parseInt(process.env.BCRYPT_SALT_ROUNDS), (err, hash) => {
        if (err) throw err;

        newUser.password = hash;
        //save user
        newUser
            .save()
            .then((value) => {
                req.flash('success_msg', 'Your account has been created!');
                res.redirect('/users/login');
            })
            .catch((value) => console.error(value));
    });
});

//update userdata handler
router.post('/update', ensureAuthenticated, async (req, res) => {
    var { name, username, email } = req.body;
    let errors = [];

    //validate data
    let newJoiSchema = joi.object({
        name: joi.string().max(255).required(),
        username: joi.string().alphanum().max(255).required(),
        email: joi.string().max(255).email().required(),
    });

    let validData = newJoiSchema.validate({ name: name, username: username, email: email });

    if (validData.error) {
        errors.push({ msg: validData.error.details[0].message });
    }

    try {
        var oldUserdata = await User.findById(req.user._id).exec();
    } catch (e) {
        console.error(e);
    }

    var newUserdata = {
        name: oldUserdata.name,
        username: oldUserdata.username,
        email: oldUserdata.email,
    };

    if (name !== oldUserdata.name) {
        newUserdata.name = name;
    }

    if (username !== oldUserdata.username) {
        try {
            var result = await User.findOne({ username: username }).exec();
        } catch (e) {
            console.error(e);
        }

        if (result) {
            errors.push({ msg: 'Username taken' });
        } else {
            newUserdata.username = username;
        }
    }

    if (email !== oldUserdata.email) {
        try {
            var result = await User.findOne({ email: email }).exec();
        } catch (e) {
            console.error(e);
        }

        if (result) {
            errors.push({ msg: 'Email already registerd' });
        } else {
            newUserdata.email = email;
        }
    }

    if (errors.length > 0) {
        res.render('users/update', {
            errors: errors,
            name: name,
            username: username,
            email: email,
            user: req.user,
        });
        return;
    }

    //update user
    try {
        await (await User.findByIdAndUpdate(req.user._id, newUserdata)).execPopulate();
    } catch (e) {
        console.error(e);
    }

    req.flash('success_msg', 'Userdate updated');
    res.redirect('/users');
});

//update userdata handler
router.post('/updatePasswd', ensureAuthenticated, async (req, res) => {
    var { password, password2 } = req.body;
    let errors = [];

    //validate data
    let newJoiSchema = joi.object({
        password: joi.string().min(6).max(255).required(),
        password2: joi.ref('password'),
    });

    let validData = newJoiSchema.validate({ password: password, password2: password2 });

    if (validData.error) {
        errors.push({ msg: validData.error.details[0].message });
    }

    if (errors.length > 0) {
        res.render('users/updatePasswd', {
            errors: errors,
            user: req.user,
        });
        return;
    }

    //hash password
    bcrypt.hash(password, parseInt(process.env.BCRYPT_SALT_ROUNDS), async (err, hash) => {
        if (err) throw err;

        password = hash;
        //save user
        try {
            await User.findByIdAndUpdate(req.user._id, { password: password }).exec();
        } catch (e) {
            console.error(e);
        }
    });

    req.flash('success_msg', 'Password updated');
    res.redirect('/users');
});

//logout handler
router.get('/logout', (req, res) => {
    req.logout();
    req.flash('success_msg', 'You are now logged out');
    res.redirect('/users/login');
});

module.exports = router;
