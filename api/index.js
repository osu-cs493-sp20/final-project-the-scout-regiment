const router = require('express').Router();

router.use('/users', require('./users'));
router.use('/courses', require('./courses'));
// router.use('/businesses', require('./businesses'));
// router.use('/photos', require('./photos'));

module.exports = router;

