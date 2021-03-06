module.exports = {
    ensureAuthenticated: function (req, res, next) {
        //skip whe authenticated
        if (req.isAuthenticated()) {
            return next();
        }

        //send error message
        req.flash('error_msg', 'Please login');
        res.redirect('/users/login');
    },
};
