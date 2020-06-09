const router = require('express').Router();

router.use('/users', require('./users'));
router.use('/assigments', require('./assign'))

module.exports = router;

