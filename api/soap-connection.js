const soap = require('soap');



class SoapClient {

    cliente;

    constructor( ambiente ){
        this.urlGetSeed = `https://${ambiente}.sii.cl/DTEWS/CrSeed.jws?WSDL`;
        this.urlGetToken = `https://${ambiente}.sii.cl/DTEWS/GetTokenFromSeed.jws?WSDL`;
    }

    getSeedClient = async () => {

       
        return new Promise( (resolve, reject) => {
            soap.createClient(this.urlGetSeed, (err, client) => {
                if(err) reject(err)
                client.getSeed( null, (err, result) => {
                    resolve(result)
                })
            })
        })
    }

    
    getTokenBySeedClient = async ( formedXml ) => {
        const args = { _xml:formedXml };
        return new Promise( (resolve, reject) => {
            soap.createClient(this.urlGetToken, {escapeXML:true, preserveWhitespace:true, wsdl_headers:'application/xml'}, (err, client) => {
                if(err) reject(err)
                client.getToken(args, (err, result) => {
                    resolve(result)
                })
            })
        })
    }


    

}



module.exports = SoapClient;



