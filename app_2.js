require('dotenv').config()

const express  = require("express")
const cors = require('cors');
const fileUpload = require('express-fileupload');
const pem = require("pem");
const { Router } = express

const { jwk2pem, pem2jwk } = require('pem-jwk')



const xml2js = require('xml2js');
const fs = require('fs')
const moment = require('moment')
const crypto = require('crypto');
const {SignedXml  } = require('xml-crypto');


const app = express();
const server = require("http").createServer( app )

const port = process.env.PORT


pem.config({  pathOpenSSL: 'C:/Program Files/Git/usr/bin/openssl.exe' })


const RUTA_PFX = `./docs/cer_56.pfx`
// const PASS_PFX = `firmadigital`
const PASS_PFX = `Sir2020SII`
// const RUTA_CARGA = `./docs/CAF_PRUEBA_ORIGINAL.xml`
const RUTA_CARGA = `./docs/CAF-156.xml`
const RUTA_XML = `./docs/T33F156.xml`
const ENCRYPT = 'RSA-SHA1';




const uniquePath = `/api/fe`;


app.use( cors() );
app.use( express.json() )
app.use( express.static('public') )

app.use(fileUpload({
    useTempFiles: true,
    tempFileDir: '/tmp/'
}))


const router = Router() 





const firmaElectronica = fs.readFileSync(RUTA_PFX)


//se paso a otro lado
const getCertificates = () => {
    return new Promise( (resolve, reject) => {
        pem.readPkcs12(firmaElectronica, { p12Password: PASS_PFX}, (err, cert) => {
        
            resolve(cert)
        })

       
    })
}

const getCertificateInfo = async (cert) => {
    return new Promise( (resolve, reject) => {
        pem.readCertificateInfo(cert, (error, resultado) => {
            resolve(resultado)
        })
    })
} 

const getFingerPrint = async (cert, encryption = "sha1")=> {
    return new Promise( (resolve, reject) => {
        pem.getFingerprint(cert, encryption, (error, resultado) => {
            resolve(resultado)
        })
    })
}

const getModulusAndExponent = (keyOrCert) => {
    return new Promise( (resolve, reject) => {
        pem.getModulus(keyOrCert.key, PASS_PFX, (error, result) => {
            resolve(result)
        })
    })
}

const getPublicKey = (cert) => {
    return new Promise( (resolve, reject)=>{
        pem.getPublicKey(cert.cert, (error, result) => {
            resolve(result)
        })
    })
}

const createPck = ({certificate}) => {
    console.log(certificate)
    return new Promise( (resolve, reject) => {
        pem.createPkcs12(certificate.key, certificate.cert, PASS_PFX, (error, pck) => {
            resolve(pck)
        })
        
    })
}



app.use(uniquePath, require('./router/firma-electronica'))


app.use(uniquePath, router.get("/", [], async (req, res) => {

    const parser = new xml2js.Parser()
    const builder = new xml2js.Builder({explicitRoot:false, headless:true, renderOpts:{pretty:false}});

    const CARGACAF =  fs.readFileSync(RUTA_CARGA);
    const XMLCAF = await parser.parseStringPromise(CARGACAF);
    const CAFORIGINAL = XMLCAF.AUTORIZACION.CAF;
    const RSASK = XMLCAF.AUTORIZACION.RSASK

    const archivoXmlAFirmar = fs.readFileSync(RUTA_XML)
    const xmlAFirmar = await parser.parseStringPromise(archivoXmlAFirmar)


    const resss = await getCertificates(); //firma pfx
    const c509 = new crypto.X509Certificate(resss.cert)
    let c509Raw = c509.raw.toString("base64")

    
    const fechaHoraActual = moment().format("YYYY-MM-DDTHH:mm:ss")

    const XMLEncabezado = xmlAFirmar.Documento.Encabezado[0]
    const XMLIdDoc = XMLEncabezado.IdDoc[0]
    const XMLEmisor = XMLEncabezado.Emisor[0]
    const XMLReceptor = XMLEncabezado.Receptor[0]

    const XMLDetalle = xmlAFirmar.Documento.Detalle[0]
    const cafToString = builder.buildObject({CAF:CAFORIGINAL[0]});

    let TD2 = `<DD><RE>${XMLEmisor.RUTEmisor[0]}</RE><TD>${XMLIdDoc.TipoDTE[0]}</TD><F>${XMLIdDoc.Folio[0]}</F><FE>${XMLIdDoc.FchEmis[0]}</FE><RR>${XMLReceptor.RUTRecep[0]}</RR><RSR>${XMLReceptor.RznSocRecep[0]}</RSR><MNT>${XMLEncabezado.Totales[0].MntTotal[0]}</MNT><IT1>${XMLDetalle.NmbItem[0]}</IT1>${cafToString}<TSTED>${fechaHoraActual}</TSTED></DD>`

    const createdHash = crypto.createHash(ENCRYPT).update(TD2);
    const hash = createdHash.digest("base64");
    const signature = crypto.privateEncrypt({key:RSASK[0], padding:crypto.constants.RSA_PKCS1_PADDING}, hash)
    


   


    Object.assign(xmlAFirmar.Documento, {
        TED:{
            $:{ "version":"1.0" },
            DD:{
                RE:XMLEmisor.RUTEmisor[0],
                TD:XMLIdDoc.TipoDTE[0],
                F:XMLIdDoc.Folio[0],
                FE:XMLIdDoc.FchEmis[0],
                RR:XMLReceptor.RUTRecep[0],
                RSR:XMLReceptor.RznSocRecep[0],
                MNT:XMLEncabezado.Totales[0].MntTotal[0],
                IT1:XMLDetalle.NmbItem[0],
                CAF:CAFORIGINAL[0],
                TSTED:fechaHoraActual
            },
            FRMT:{
                $:{"algoritmo":"SHA1withRSA"},
                _:signature.toString("base64")
            }
        },
        TmstFirma:{
            _:fechaHoraActual
        }
    })

    const final = {
        DTE:{
            $:{ "version":"1.0"},
            Documento:xmlAFirmar.Documento
        }
    }


    var option = {
        implicitTransforms: ["http://www.w3.org/TR/2001/REC-xml-c14n-20010315"],
        canonicalizationAlgorithm:"http://www.w3.org/TR/2001/REC-xml-c14n-20010315",
    }
    const sig = new SignedXml(null, option)




    const builderFinal = new xml2js.Builder({explicitRoot:false, headless:true, renderOpts:{pretty:true, newline:'\n'}});
    const xml = builderFinal.buildObject(final);

    sig.signingKey = resss.key
    const jwk2 = pem2jwk(resss.key);


    let contadorC509 = 1;
    for(let i = 0; i <= c509Raw.length; i++){

        

        if(contadorC509 === 77){
            c509Raw = c509Raw.slice(0, i)+'\n'+c509Raw.slice(i)
            contadorC509 = 0;
        }

        contadorC509++;

    }

    const binario  = Buffer.from(jwk2.n, 'base64')


    console.log(c509Raw)
    
    // NODE: tqBjMDX1eJJaea0Sgllif1M9MtKxi14-ttF9xHexEP8ST_8oq2kOQ6Oa2JtPHCdEsl3qdm3k0ihBvRjM05FB1E_4srol4D9NcBvvHCQi4jBxofEkP2kAmgME5nPSVXG0Vi0BiDSlaubR6lGCp4MSCFIiEEe2ntS836GCQd6YLyU
    // FACT: tqBjMDX1eJJaea0Sgllif1M9MtKxi14+ttF9xHexEP8ST/8oq2kOQ6Oa2JtPHCdEsl3qdm3k0ihB vRjM05FB1E/4srol4D9NcBvvHCQi4jBxofEkP2kAmgME5nPSVXG0Vi0BiDSlaubR6lGCp4MSCFIi EEe2ntS836GCQd6YLyU=
    const keyValue = `<KeyValue><RSAKeyValue><Modulus>${binario.toString('base64')}</Modulus><Exponent>${jwk2.e.toString("base64")}</Exponent></RSAKeyValue></KeyValue>`;
    // const keyValue = ``;
    
    sig.keyInfoProvider = {   

        getKeyInfo: (key, prefix)=> {
            prefix = prefix || ''
            prefix = prefix ? prefix + ':' : prefix
            return `${keyValue}<${prefix}X509Data><X509Certificate>${c509Raw}</X509Certificate></${prefix}X509Data>`;
        },
    
    }



   
    // info = sig.getKeyInfo()
    // console.log({info})
    sig.addReference("//*[local-name(.)='Documento']", ["http://www.w3.org/2000/09/xmldsig#enveloped-signature"])
    console.log(xml)
    sig.computeSignature(xml)
    fs.writeFileSync('./docs/xml_154_firmado_final_final.xml', sig.getSignedXml())

    console.log('Escribio')
    

    // const signatureTag = {
    //     SignedInfo:{
    //         CanonicalizationMethod:{
    //             $:{"Algorithm":"http://www.w3.org/TR/2001/REC-xml-c14n-20010315"}
    //         },
    //         SignatureMethod:{
    //             $:{"Algorithm":"http://www.w3.org/2000/09/xmldsig#rsa-sha1"}
    //         },
    //         Reference:{
    //             $:{"URI":`#${xmlAFirmar.Documento.$.ID}`},
    //             Transforms:{
    //                 Transform:{
    //                     $:{"Algorithm":"http://www.w3.org/2000/09/xmldsig#enveloped-signature"}
    //                 }
    //             },
    //             DigestMethod:{
    //                 $:{"Algorithm":"http://www.w3.org/2000/09/xmldsig#sha1"}
    //             },
    //             DigestValue:{}
    //         }
    //     },
    //     SignatureValue:{ },
    //     KeyInfo:{
    //         KeyValue:{
    //             RSAKeyValue:{
    //                 Modulus:{},
    //                 Exponent:{}
    //             }
    //         },
    //         X509Data:{
    //             X509Certificate: c509Raw
    //         }
    //     }
    // }

    // Object.assign(xmlAFirmar, {Signature:signatureTag})

    // const builderFinal = new xml2js.Builder({explicitRoot:false, headless:true, renderOpts:{pretty:true, newline:'\n'}});
    // const xml = builderFinal.buildObject(xmlAFirmar);

    res.status(200).json({
        ok:true, 
        msg:"HOla mundo",
    })
}))


server.listen( port, () => {
    console.log(`Servidor corriendo en puerto ${port}`)
})
