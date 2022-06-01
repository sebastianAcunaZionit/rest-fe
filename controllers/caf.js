const fs = require('fs')
const { duplicatedCafVerify } = require("../helpers/validate-caf-xml");
const httpResponses = require("../utils/htttp-responses");


const addCaf = async (req, res) => {

    const bd_conection = req.bd_conection;
    const usuario = req.usuario;

    const { files } = req;


    if(!files){
        return res.status(httpResponses.HTTP_BAD_REQUEST).json({
            ok:false,
            response:'Debes incluir el archivo CAF'
        })
    }
    const {caf} = files; 

    if(!caf){
        return res.status(httpResponses.HTTP_BAD_REQUEST).json({
            ok:false,
            response:'Debes incluir el archivo CAF'
        })
    }
    
    const existeCaf = await duplicatedCafVerify(caf, bd_conection, usuario);

    if(!existeCaf.ok){
        return res.status(httpResponses.HTTP_INTERNAL_SERVER_ERROR).json({
            ok:false,
            response:existeCaf.response
        })
    }
    
    fs.rmSync(existeCaf.response);

    return res.status(httpResponses.HTTP_OK).json({
        ok:true,
        response:'CAF creado con exito.'
    })

}


module.exports = {
    addCaf
}