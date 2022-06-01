
const JWT = require('jsonwebtoken');

const generarJWT = ( uid = '', name= '', system = '' ) => {

    return new Promise( (resolve, reject) => {

        const payload = { uid, name, system }

        JWT.sign( payload, process.env.PUBLIC_OR_PRIVATE_KEY, {
        }, (err, token) => {
            if(err){
                reject(`No se pudo generar el token. [${err}]`)
            }else{
                resolve(token);
            }
        })

    });
}



module.exports = {
    generarJWT
}