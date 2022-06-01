const { pem2jwk } = require('pem-jwk')


const getRSAPK = async (certkey, parseModulus) => {

    const jwk2 = pem2jwk(certkey);

    const binario  = Buffer.from(jwk2.n, 'base64')


    let binarioFinal = binario.toString('base64');

    binarioFinal = binarioFinal.toString("base64");

    if(parseModulus){
        let contadorC509 = 1;
        for(let i = 0; i <= binarioFinal.length; i++){
            if(contadorC509 === 77){
                binarioFinal = binarioFinal.slice(0, i)+'\n'+binarioFinal.slice(i)
                contadorC509 = 0;
            }
            contadorC509++;
        }
    }
   

    return {...jwk2, n_plus:binarioFinal}

}


module.exports = {
    getRSAPK
}