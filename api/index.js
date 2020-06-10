const router = require('express').Router();

router.use('/users', require('./users'));
router.use('/assignments', require('./assign'))
router.use('/courses', require('./courses'));

module.exports = router;

