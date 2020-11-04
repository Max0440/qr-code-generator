const express = require('express');
const bcrypt = require('bcrypt');
const passport = require('passport');
const { ensureAuthenticated } = require('../config/auth.js');

const User = require('../models/users');

const router = express.Router();

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

//register handler
router.post('/register', async (req, res) => {
    //TODO in try catch
    const { name, username, email, password, password2 } = req.body;
    let errors = [];
    console.log(' Name ' + name + 'username ' + username + ' email :' + email + ' pass:' + password);

    //check if fields empty
    if (!name || !username || !email || !password || !password2) {
        errors.push({ msg: 'Please fill in all fields' });
    }

    //check if passwords match
    if (password !== password2) {
        errors.push({ msg: 'passwords dont match' });
    }

    //check if password is more than 6 characters
    if (password.length < 6) {
        errors.push({ msg: 'password atleast 6 characters' });
    }

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

    //validation passed
    const emailFound = await User.findOne({ email: email }).exec();
    const usernameFound = await User.findOne({ username: username }).exec();

    if (emailFound) {
        console.log(emailFound);
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
        console.log(usernameFound);
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
                console.log(value);
                req.flash('success_msg', 'You have now registered!');
                res.redirect('/users/login');
            })
            .catch((value) => console.log(value));
    });
});

//login handler
router.post('/login', (req, res, next) => {
    //TODO: Login with email OR username
    passport.authenticate('local', {
        successRedirect: '/',
        failureRedirect: '/users/login',
        failureFlash: true,
    })(req, res, next);
});

//logout handler
router.get('/logout', (req, res) => {
    req.logout();
    req.flash('success_msg', 'Now logged out');
    res.redirect('/users/login');
});

module.exports = router;
