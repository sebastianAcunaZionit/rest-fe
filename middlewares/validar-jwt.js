const jwt = require('jsonwebtoken');
const { QueryTypes } = require('sequelize');
const { getBdConection } = require('../database/bd-conections');
const { connectDB } = require('../database/conection');
const httpResponses = require('../utils/htttp-responses');

const validarJWT = async (req, res, next ) => {

    const token = req.header('x-token');

    if( !token ){
        return res.status(httpResponses.HTTP_BAD_REQUEST).json({ok:false, response:'No hay token en la peticion'})
    }

    try{

        const { uid, system } = jwt.verify(token, process.env.PUBLIC_OR_PRIVATE_KEY);


        const conectionParams = await getBdConection(system);

        if(conectionParams.length <= 0){
            return res.status(httpResponses.HTTP_BAD_REQUEST).json({ok:false, response:'Sistema no registrado'})
        }

        const conexion = await connectDB({options:conectionParams})


        const usuario = await conexion.query('SELECT * FROM usuario WHERE id_user = :id_user ', {
            replacements:{ id_user: uid },
            type:QueryTypes.SELECT
        })


        if( usuario.length <=  0 ){
            return res.status(httpResponses.HTTP_BAD_REQUEST).json({ok:false, response:'Usuario no existe en bd'});   
        }

        await  conexion.close();
        
        req.usuario = usuario[0];
        req.bd_conection = conectionParams;

        next();
    }catch(err){
        return res.status(httpResponses.HTTP_INTERNAL_SERVER_ERROR).json({ok:false, response:`Problemas al validar token \nERROR : [${err}]`})
    }
}

module.exports = {
    validarJWT
}