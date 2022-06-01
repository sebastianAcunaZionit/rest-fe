const { QueryTypes } = require("sequelize");
const md5 = require("md5");



const { getBdConection } = require("../database/bd-conections");
const { connectDB } = require("../database/conection");
const httpResponses = require("../utils/htttp-responses");
const { generarJWT } = require('../helpers/generar-jwt')

const authenticate = async (req, res) => {

    const { username, password, system } = req.body;

    try {

        const bd_conection = await getBdConection(system);

        if(!bd_conection){
            return res.status(httpResponses.HTTP_BAD_REQUEST).json({
                ok:false,
                response:`BD NO incluida, contacte con un administrador`
            })
        }  


        const conexion = await connectDB( {options: bd_conection} );

        const encrypted_pass = md5(password);


        const existeUsuario = await conexion.query(`SELECT * FROM usuario WHERE login_user = :login_user AND psw_user_encrip = :psw `, {
            replacements:{ login_user: username, psw: encrypted_pass },
            type:QueryTypes.SELECT
        })


        if(existeUsuario.length <= 0){
            return res.status(httpResponses.HTTP_BAD_REQUEST).json({
                ok:false,
                response:'Usuario no existe en BD.',
            })
        }


        const token  = await generarJWT(existeUsuario[0].id_user, existeUsuario[0].nom_user, system);

        const usuario = {
            id_user:existeUsuario[0].id_user,
            nom_user:existeUsuario[0].nom_user,
            correo_user:existeUsuario[0].correo_user,
            login_user:existeUsuario[0].login_user
        }


        await  conexion.close();
        return res.status(httpResponses.HTTP_OK).json({
            ok:true,
            response:'Bienvenido',
            usuario:usuario,
            token
        })
        
    } catch (error) {
        return res.status(httpResponses.HTTP_INTERNAL_SERVER_ERROR).json({
            ok:false,
            response:`Error en la peticion : [${error}]`
        })
    }


}

module.exports = { authenticate }