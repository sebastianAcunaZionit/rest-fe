const {X509Certificate} = require('crypto');

const getC509 = (certificate) =>  new X509Certificate(certificate);


const getC509Raw = async ( certificate ) => {
    const c509 = getC509(certificate);
    
    let c509Raw =  c509.raw.toString("base64");

    let contadorC509 = 1;
    for(let i = 0; i <= c509Raw.length; i++){
        if(contadorC509 === 77){
            c509Raw = c509Raw.slice(0, i)+'\n'+c509Raw.slice(i)
            contadorC509 = 0;
        }
        contadorC509++;
    }
    return c509Raw;
}


module.exports = {
    getC509,
    getC509Raw
}