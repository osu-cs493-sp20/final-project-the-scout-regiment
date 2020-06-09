const router = require('express').Router();

router.use('/users', require('./users'));
router.use('/assigments', require('./assign'))
router.use('/courses', require('./courses'));

module.exports = router;

