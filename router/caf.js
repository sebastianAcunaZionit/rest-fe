
const { Router } = require('express'); 
const { addCaf } = require('../controllers/caf');
const { validarCampos } = require('../helpers/validar-campos');
const { validarJWT } = require('../middlewares/validar-jwt');
const router  = Router(); 



router.post('/add-caf', [
    validarJWT,
    validarCampos
], addCaf);




module.exports = router;