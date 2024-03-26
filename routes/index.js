const { Router } = require('express')
const router = Router()


router.use('/users', require('./users'))
router.use('/admin',require('./admin'))

module.exports = router