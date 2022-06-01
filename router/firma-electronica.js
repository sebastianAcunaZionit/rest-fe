const { Router } = require('express'); 
const { check } = require('express-validator');


const { doSignXml } = require('../controllers/firmar-xml');
const { validarCampos } = require('../helpers/validar-campos');
const { validarJWT } = require('../middlewares/validar-jwt');

const router  = Router();


router.post('/sign', [
    validarJWT,
    validarCampos
], doSignXml);


module.exports = router;