const { Router } = require('express'); 
const { check } = require('express-validator');
const { authenticate } = require('../controllers/login');
const { validarCampos } = require('../helpers/validar-campos');
const router  = Router(); 


router.post('/login', [
    check("username", "debe incluir un nombre de usuario").notEmpty(),
    check("password", "Debe incluir una contraseña").notEmpty(),
    check("system", "Debe incluir un sistema").notEmpty(),
    validarCampos
], authenticate);


module.exports = router;