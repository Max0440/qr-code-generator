const express = require('express');
const qrcode = require('qrcode');
const yup = require('yup');
const { nanoid } = require('nanoid');
const { ensureAuthenticated } = require('../config/auth.js');

const Qrcode = require('../models/qrcode');
const User = require('../models/users');

const router = express();

qrcodeOptions = {
    errorCorrectionLevel: 'H',
    type: 'image/jpeg',
    quality: 1,
    margin: 3,
    scale: 5,
    color: {
        dark: '#FFFFFF',
        light: '#2f3136',
    },
};

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
        redirectUrl: process.env.FORWARDING_URL_START,
        user: req.user,
    });
});

//add qrcode page
router.get('/add', ensureAuthenticated, (req, res) => {
    res.render('qrcode/add', {
        user: req.user,
    });
});

//edit qrcode page
router.post('/edit', ensureAuthenticated, async (req, res) => {
    var slug = req.body.edit;

    let errors = [];

    try {
        var userCodes = await getSlugsFromUser(req.user._id);
    } catch (e) {
        console.error(e);
    }

    for (let i = 0; i < userCodes.length; i++) {
        const element = userCodes[i];
        if (element === slug) {
            var validSlug = true;
            break;
        }
    }

    if (!validSlug) {
        errors.push({ msg: 'Unauthorized' });
    }

    if (errors.length > 0) {
        req.flash('error_msg', errors[0].msg);
        res.redirect('/qrcode');
        return;
    }

    try {
        var code = await getCode(slug);
    } catch (e) {
        console.error(e);
    }

    res.render('qrcode/edit', {
        url: code.url,
        slug: code.slug,
        oldSlug: code.slug,
        user: req.user,
    });
});

//print qrcode page
router.post('/print', ensureAuthenticated, async (req, res) => {
    var slug = req.body.print;

    let errors = [];

    try {
        var userCodes = await getSlugsFromUser(req.user._id);
    } catch (e) {
        console.error(e);
    }

    for (let i = 0; i < userCodes.length; i++) {
        const element = userCodes[i];
        if (element === slug) {
            var validSlug = true;
            break;
        }
    }

    if (!validSlug) {
        errors.push({ msg: 'Unauthorized' });
    }

    if (errors.length > 0) {
        req.flash('error_msg', errors[0].msg);
        res.redirect('/qrcode');
        return;
    }

    try {
        var code = await getCode(slug);
    } catch (e) {
        console.error(e);
    }

    res.render('qrcode/print', {
        url: code.url,
        backgroundColor: '#2f3136',
        codeColor: '#FFFFFF',
        slug: code.slug,
        user: req.user,
    });
});

//edit qrcode handeler
router.post('/printSubmit', ensureAuthenticated, async (req, res) => {
    var { slug, backgroundColor, codeColor, scale } = req.body;

    let errors = [];

    //check if old slug is from user
    try {
        var userCodes = await getSlugsFromUser(req.user._id);
    } catch (e) {
        console.error(e);
    }

    for (let i = 0; i < userCodes.length; i++) {
        const element = userCodes[i];
        if (element === slug) {
            var validSlug = true;
            break;
        }
    }

    if (!validSlug) {
        errors.push({ msg: 'Unauthorized' });
    }

    //set code options
    customQrcodeOptions = {
        errorCorrectionLevel: 'H',
        type: 'image/jpeg',
        quality: 1,
        margin: 2,
        scale: scale,
        color: {
            dark: codeColor,
            light: backgroundColor,
        },
    };

    //generate code
    qrcode.toDataURL(process.env.FORWARDING_URL_START + slug, customQrcodeOptions, function (err, code) {
        if (err) throw err;

        //TODO: gescheid machen
        console.log(code);
        res.render('qrcode/printed', {
            code: code,
            user: req.user,
        })
    });
});

//edit qrcode handeler
router.post('/editSubmit', ensureAuthenticated, async (req, res) => {
    var { url, slug, oldSlug } = req.body;

    let errors = [];
    let unauthorized = false;

    //check if old slug is from user
    try {
        var userCodes = await getSlugsFromUser(req.user._id);
    } catch (e) {
        console.error(e);
    }

    for (let i = 0; i < userCodes.length; i++) {
        const element = userCodes[i];
        if (element === oldSlug) {
            var validSlug = true;
            break;
        }
    }

    if (!validSlug) {
        unauthorized = true;
        errors.push({ msg: 'Unauthorized' });
    }

    //check if slug entered & not in db
    try {
        if (slug.length === 0) {
            //TODO: autogenerate slug
            errors.push({ msg: 'Please enter a slug' });
        }
        let inDb = await getCode(slug);
        if (inDb) {
            if (inDb.slug != oldSlug) {
                errors.push({ msg: 'The slug is taken' });
            }
        }
    } catch (e) {
        console.error(e);
    }

    //ckeck if incoming data is valid
    //TODO: check if slug is url friendly
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

    if (!(await inputSchema.isValid(newQrcode))) {
        errors.push({ msg: 'An error has occurred' });
    }

    if (errors.length > 0) {
        if (unauthorized === true) {
            req.flash('error_msg', errors[0].msg);
            res.redirect('/qrcode');
        } else {
            res.render('qrcode/edit', {
                errors: errors,
                url: url,
                slug: slug,
                oldSlug: oldSlug,
                user: req.user,
            });
        }
        return;
    }

    //update url and slug
    try {
        await Qrcode.findOneAndUpdate({ slug: oldSlug }, { slug: slug, url: url }).exec();
    } catch (e) {
        console.error(e);
    }

    if (slug != oldSlug) {
        //update slug in user collection
        try {
            await updateSlugFromUser(oldSlug, slug, req.user._id);
        } catch (e) {
            console.error(e);
        }

        //generate new qrcode
        qrcode.toDataURL(process.env.FORWARDING_URL_START + slug, qrcodeOptions, async function (err, code) {
            if (err) throw err;

            //Update qrcode in db

            try {
                await Qrcode.findOneAndUpdate({ slug: slug }, { code: code }).exec();
            } catch (e) {
                console.error(e);
            }
        });

        req.flash('error_msg', 'Warning: The old QR Code became invalid');
    }

    req.flash('success_msg', 'Code updated');
    res.redirect('/qrcode');
});

//add qrcode handler
router.post('/add', ensureAuthenticated, async (req, res) => {
    var { url, slug } = req.body;

    let errors = [];

    //check if slug entered & not in db
    if (!slug) {
        var slugAutoGenerated = true;
        var validSlug = false;
        while (!validSlug) {
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
    //TODO: check if slug is url friendly
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

    if (!(await inputSchema.isValid(newQrcode))) {
        errors.push({ msg: 'An error has occurred' });
    }

    if (errors.length > 0) {
        if (slugAutoGenerated) {
            res.render('qrcode/add', {
                errors: errors,
                url: url,
                user: req.user,
            });
        } else {
            res.render('qrcode/add', {
                errors: errors,
                url: url,
                slug: slug,
                user: req.user,
            });
        }
        return;
    }

    newQrcode
        .save()
        .then((value) => {
            qrcode.toDataURL(process.env.FORWARDING_URL_START + value.slug, qrcodeOptions, function (err, code) {
                if (err) throw err;

                //Add new qrcode to db
                Qrcode.findByIdAndUpdate(value._id, { code: code }, async (error, result) => {
                    if (error) throw error;

                    try {
                        await addSlugToUser(result.slug, req.user._id);

                        req.flash('success_msg', 'QR Code added');
                        res.redirect('/qrcode/add');
                    } catch (e) {
                        console.error(e);
                    }
                });
            });
        })
        .catch((value) => console.error(value));
});

//delete qrcode
router.post('/delete', ensureAuthenticated, async (req, res) => {
    var slug = req.body.delete;

    let errors = [];

    try {
        var userCodes = await getSlugsFromUser(req.user._id);
    } catch (e) {
        console.error(e);
    }

    for (let i = 0; i < userCodes.length; i++) {
        const element = userCodes[i];
        if (element === slug) {
            var validSlug = true;
            break;
        }
    }

    if (!validSlug) {
        errors.push({ msg: 'Unauthorized' });
    }

    if (errors.length > 0) {
        res.render('qrcode/add', {
            errors: errors,
            user: req.user,
        });
        return;
    }

    //delete code
    Qrcode.findOneAndDelete({ slug: slug }, (err, result) => {
        if (err) throw err;
    });

    //Delete qrcode from user
    removeSlugFromUser(slug, req.user._id);

    res.redirect('/qrcode');
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

//edit

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

async function addSlugToUser(slug, userId) {
    try {
        await User.findByIdAndUpdate(userId, { $push: { slugs: slug } });
    } catch (e) {
        console.error(e);
    }
}

async function removeSlugFromUser(slug, userId) {
    try {
        await User.findByIdAndUpdate(userId, { $pull: { slugs: slug } });
    } catch (e) {
        console.error(e);
    }
}

async function getSlugsFromUser(userId) {
    try {
        let user = await User.findById(userId).exec();
        return user.slugs;
    } catch (e) {
        console.error(e);
    }
}

async function updateSlugFromUser(oldSlug, newSlug, userId) {
    try {
        await removeSlugFromUser(oldSlug, userId);
        await addSlugToUser(newSlug, userId);
    } catch (e) {
        console.error(e);
    }
}

module.exports = router;
