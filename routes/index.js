const express = require('express');
const {ensureAuthenticated} = require("../config/auth.js")

const router = express.Router();

//welcome page
router.get('/', (req, res) => {
    res.render('main', {
        user: req.user,
    });
});

module.exports = router;
