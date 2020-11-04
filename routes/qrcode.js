const express = require('express');
const qrcode = require('qrcode');
const { ensureAuthenticated } = require('../config/auth.js');

const Qrcode = require('../models/qrcode');
const User = require('../models/users');

const router = express();

//show qrcodes page
router.get('/', ensureAuthenticated, async (req, res) => {
    try {
        var codes = await User.findById(req.user._id);
        codes = codes.qrcodes;
    } catch (e) {
        console.log(e);
    }

    try {
        var codeArray = [];
        for (let i = 0; i < codes.length; i++) {
            const element = codes[i];
            codeArray.push(await getCode(element));
        }
    } catch (e) {
        console.log(e);
    }

    res.render('qrcode/show', {
        codes: codeArray,
        user: req.user,
    });
});

//add qrcode page
router.get('/add', ensureAuthenticated, (req, res) => {
    res.render('qrcode/add', {
        user: req.user,
    });
});

//add qrcode handler
router.post('/add', ensureAuthenticated, (req, res) => {
    //TODO check if actual url
    const url = req.body.url;
    console.log(url);

    let errors = [];

    if (!url) {
        errors.push({ msg: 'Please fill in url' });
    }

    if (errors.length > 0) {
        res.render('qrcode/add', {
            errors: errors,
            user: req.user,
        });
        return;
    }

    const newQrcode = new Qrcode({
        code: 'undefined',
        url: url,
        scans: 0,
    });

    Qrcode.nextCount((err, count) => {
        if (err) throw err;

        newQrcode
            .save()
            .then((value) => {
                qrcode.toDataURL(process.env.FORWARDING_URL_START + value.codeId, function (err, code) {
                    if (err) throw err;

                    //Add new qrcode to db
                    Qrcode.findByIdAndUpdate(value._id, { code: code }, async (error, result) => {
                        if (error) throw error;

                        try {
                            await addCodeToUser(result, req.user._id);

                            req.flash('success_msg', 'Item added');
                            res.redirect('/qrcode/add');
                        } catch (e) {
                            console.log(e);
                        }
                    });
                });
            })
            .catch((value) => console.log(value));
    });
});

//scan qrcode
router.get('/scan/:id', async (req, res) => {
    const id = req.params.id;

    //get code
    try {
        var result = await getCode(id);

        //check if qrcodes exists
        if (result === null) {
            console.error(`Qrcode from scan with id ${req.params.id} not found`);
            return;
        }

        await updateScans(result._id);
    } catch (e) {
        console.log(e);
    }

    //TODO Redirect
    console.log(result);
    res.redirect(result.url);
});

async function getCode(codeId) {
    try {
        return await Qrcode.findOne({ codeId: codeId }).exec();
    } catch (e) {
        return false;
    }
}

async function updateScans(id) {
    try {
        return await Qrcode.findByIdAndUpdate(id, { $inc: { scans: 1 } }).exec();
    } catch (e) {
        return false;
    }
}

async function addCodeToUser(data, userId) {
    try {
        console.log(userId);
        await User.findByIdAndUpdate(userId, { $push: { qrcodes: data.codeId } });
    } catch (e) {
        console.log(e);
    }
}

module.exports = router;
