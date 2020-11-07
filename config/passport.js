const LocalStrategy = require('passport-local').Strategy;
const bcrypt = require('bcrypt');
const User = require('../models/users');

module.exports = function (passport) {
    passport.use(
        new LocalStrategy({ usernameField: 'email' }, async (email, password, done) => {
            console.log(email);
            //check email
            var user = await checkEmail(email);

            if (user === null) {
                user = await checkUsername(email);
            }

            if (user === null) {
                return done(null, false, { message: 'Username/Email or password incorrect' });
            }

            //match password
            bcrypt.compare(password, user.password, (err, result) => {
                if (err) throw err;

                if (result) {
                    return done(null, user);
                } else {
                    return done(null, false, { message: 'Username/Email or password incorrect' });
                }
            });
        })
    );
    passport.serializeUser(function (user, done) {
        done(null, user.id);
    });

    passport.deserializeUser(function (id, done) {
        User.findById(id, function (err, user) {
            done(err, user);
        });
    });
};

async function checkEmail(email) {
    try {
        return await User.findOne({ email: email }).exec();
    } catch (e) {
        console.error(e);
    }
}

async function checkUsername(username) {
    try {
        return await User.findOne({ username: username }).exec();
    } catch (e) {
        console.error(e);
    }
}
