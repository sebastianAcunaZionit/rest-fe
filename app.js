require('dotenv').config()

const express  = require("express")
const {Router} = express
const xml2js = require('xml2js');
const fs = require('fs')

const moment = require('moment')

const crypto = require('crypto');
const {X509Certificate} = require('crypto')



const {SignedXml} = require('xml-crypto')


const app = express();
const server = require("http").createServer( app )

const port = process.env.PORT

const pem = require("pem");


const RUTA_PFX = `./docs/cer_56.pfx`
// const PASS_PFX = `firmadigital`
const PASS_PFX = `Sir2020SII`
const RUTA_CARGA = `./docs/CARGA_XML_AUTENT_37.xml`
const RUTA_XML = `./docs/T33F154.xml`
const ENCRYPT = 'RSA-SHA1';


pem.config({
    pathOpenSSL: 'C:/Program Files/Git/usr/bin/openssl.exe'
  })

const uniquePath = `/api/fe`;

app.use( express.json() )
app.use( express.static('public') )


const router = Router() 



const firmaElectronica = fs.readFileSync(RUTA_PFX)



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


app.use(uniquePath, router.get("/", [], async (req, res) => {

    const parser = new xml2js.Parser()
    const builder = new xml2js.Builder({explicitRoot:false, headless:true, renderOpts:{pretty:false}});

    const CARGACAF =  fs.readFileSync(RUTA_CARGA);
    const XMLCAF = await parser.parseStringPromise(CARGACAF);
    const CAFORIGINAL = XMLCAF.AUTORIZACION.CAF;
    const RSASK = XMLCAF.AUTORIZACION.RSASK

    const archivoXmlAFirmar = fs.readFileSync(RUTA_XML)
    const xmlAFirmar = await parser.parseStringPromise(archivoXmlAFirmar)


    
    const resss = await getCertificates();
    const c509 = new X509Certificate(resss.cert)
    const c509Raw = c509.raw.toString("base64")


    console.log(resss)

    const sig = new SignedXml()



    const fechaHoraActual = moment().format("YYYY-MM-DDTHH:MM:SS")

    const XMLEncabezado = xmlAFirmar.Documento.Encabezado[0]
    const XMLIdDoc = XMLEncabezado.IdDoc[0]
    const XMLEmisor = XMLEncabezado.Emisor[0]
    const XMLReceptor = XMLEncabezado.Receptor[0]

    const XMLDetalle = xmlAFirmar.Documento.Detalle[0]
    const cafToString = builder.buildObject({CAF:CAFORIGINAL[0]});

    let TD2 = `<DD><RE>${XMLEmisor.RUTEmisor[0]}</RE><TD>${XMLIdDoc.TipoDTE[0]}</TD><F>${XMLIdDoc.Folio[0]}</F><FE>${XMLIdDoc.FchEmis[0]}</FE><RR>${XMLReceptor.RUTRecep[0]}</RR><RSR>${XMLReceptor.RznSocRecep[0]}</RSR><MNT>${XMLEncabezado.Totales[0].MntTotal[0]}</MNT><IT1>${XMLDetalle.NmbItem[0]}</IT1>${cafToString}<TSTED>2022-02-28T13:24:05</TSTED></DD>`

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
        }
    })

    const builderFinal = new xml2js.Builder({explicitRoot:false, headless:true, renderOpts:{pretty:true, newline:'\n'}});
    const xml = builderFinal.buildObject(xmlAFirmar);

    console.log(  xml )

    sig.addReference("//*[local-name(.)='Documento']")
    sig.signingKey = resss.key
    sig.keyInfoProvider = {
        getKeyInfo : function (){
            return "<X509Data><X509Certificate>" + c509Raw + "</X509Certificate></X509Data>";
        }
    }
    sig.computeSignature(xml)

    fs.writeFileSync('./docs/xml_154_firmado_final_final.xml', sig.getSignedXml())

    

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
        c509:c509,
        xml
    })
}))


server.listen( port, () => {
    console.log(`Servidor corriendo en puerto ${port}`)
})
