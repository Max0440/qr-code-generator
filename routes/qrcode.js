const express = require('express');
const qrcode = require('qrcode');
const yup = require('yup');
const { nanoid } = require('nanoid');
const { ensureAuthenticated } = require('../config/auth.js');

const Qrcode = require('../models/qrcode');
const User = require('../models/users');

const router = express();

//show qrcodes page
router.get('/', ensureAuthenticated, async (req, res) => {
    try {
        var codes = await User.findById(req.user._id);
        codes = codes.slugs;
    } catch (e) {
        console.error(e);
    }

    try {
        var codeArray = [];
        for (let i = 0; i < codes.length; i++) {
            const element = codes[i];
            codeArray.push(await getCode(element));
        }
    } catch (e) {
        console.error(e);
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
router.post('/add', ensureAuthenticated, async (req, res) => {
    //TODO check if actual url
    //TODO check if slug is url friendly
    var { url, slug } = req.body;

    let errors = [];

    //check if slug entered & not in db
    if (!slug) {
        var validSlug = false;
        while (!validSlug) {
            console.log('unvalid');
            try {
                slug = generateSlug();
                let inDb = await getCode(slug);
                if (!inDb) {
                    validSlug = true;
                }
            } catch (e) {
                console.error(e);
            }
        }
    } else {
        try {
            let inDb = await getCode(slug);
            if (inDb) {
                errors.push({ msg: 'The slug is taken' });
            }
        } catch (e) {
            console.error(e);
        }
    }

    //ckeck if incoming data is valid
    //TODO: check if url friendly
    const inputSchema = yup.object().shape({
        url: yup.string().trim().url().required(),
        slug: yup.string(),
    });

    const newQrcode = new Qrcode({
        code: 'undefined',
        url: url,
        scans: 0,
        slug: slug,
    });

    if (!await inputSchema.isValid(newQrcode)) {
        errors.push({ msg: 'Error in data' });
    }

    if (errors.length > 0) {
        res.render('qrcode/add', {
            errors: errors,
            user: req.user,
        });
        return;
    }

    console.log('Slug:', slug);

    newQrcode
        .save()
        .then((value) => {
            qrcode.toDataURL(process.env.FORWARDING_URL_START + value.slug, function (err, code) {
                if (err) throw err;

                //Add new qrcode to db
                Qrcode.findByIdAndUpdate(value._id, { code: code }, async (error, result) => {
                    if (error) throw error;

                    try {
                        await addCodeToUser(result, req.user._id);

                        req.flash('success_msg', 'Item added');
                        res.redirect('/qrcode/add');
                    } catch (e) {
                        console.error(e);
                    }
                });
            });
        })
        .catch((value) => console.error(value));
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
        console.error(e);
    }

    res.redirect(result.url);
});

function generateSlug() {
    return nanoid(process.env.SLUG_SIZE || 4);
}

async function getCode(slug) {
    try {
        return await Qrcode.findOne({ slug: slug }).exec();
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
        await User.findByIdAndUpdate(userId, { $push: { slugs: data.slug } });
    } catch (e) {
        console.error(e);
    }
}

module.exports = router;
