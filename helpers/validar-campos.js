
const { validationResult } = require('express-validator');
const httpResponses = require('../utils/htttp-responses');


const validarCampos  = (req, res, next) => {
    
    const errors = validationResult(req);
    if(!errors.isEmpty()){
        return res.status(httpResponses.HTTP_BAD_REQUEST).json({
            ok:false,
            response:`Se han encontrado los siguientes errores:\n ${errors.errors.map( (el, index) => `${index + 1}.- msg:${el.msg}, param:${el.param}`).join(`\n`)}`
        });
    }
    next();

}


module.exports = {
    validarCampos
}