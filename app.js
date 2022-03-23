require('dotenv').config()

const express  = require("express")
const {Router} = express
const xml2js = require('xml2js');
const fs = require('fs')

const moment = require('moment')

const crypto = require('crypto');
const {X509Certificate} = require('crypto')


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
            pem.getFingerprint(cert.cert, "sha1", (error, resultado) => {
                console.log("fingerprint",resultado)
            })
            pem.readCertificateInfo(cert.cert, (error2, resulta) => {
                console.log("certificateInfo",resulta)
            })
            
            
            
            resolve(cert)
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


app.use(uniquePath, router.post("/", [], async (req, res) => {

    const parser = new xml2js.Parser()
    const builder = new xml2js.Builder({explicitRoot:false, headless:true, renderOpts:{pretty:false}});

    const CARGACAF =  fs.readFileSync(RUTA_CARGA)
    const archivoXmlAFirmar = fs.readFileSync(RUTA_XML)

    const XMLCAF = await parser.parseStringPromise(CARGACAF)
    const RSASK = XMLCAF.AUTORIZACION.RSASK
    const CAFORIGINAL = XMLCAF.AUTORIZACION.CAF
   
    
    const xmlAFirmar = await parser.parseStringPromise(archivoXmlAFirmar)
    
    const resss = await getCertificates();

    const c509 = new X509Certificate(resss.cert)

    const c509Raw = c509.raw.toString("base64")

    const c509PubK = c509.publicKey

    const publicKey = await getPublicKey(resss);

    


    // const modulus = await getModulusAndExponent(c509)
    // const acaaa = await getModulusAndExponent(resss)

    
    // console.log("getModulus",acaaa)

    const fechaHoraActual = moment().format("YYYY-MM-DDTHH:MM:SS")

    const XMLEncabezado = xmlAFirmar.Documento.Encabezado[0]
    const XMLIdDoc = XMLEncabezado.IdDoc[0]
    const XMLEmisor = XMLEncabezado.Emisor[0]
    const XMLReceptor = XMLEncabezado.Receptor[0]

    const XMLDetalle = xmlAFirmar.Documento.Detalle[0]
    const cafToString = builder.buildObject({CAF:CAFORIGINAL[0]});

    // let TD2 = `<DD><RE>76010133-8</RE><TD>33</TD><F>154</F><FE>2022-02-28</FE><RR>15953693-9</RR><RSR>RODRIGO DEL CANTO</RSR><MNT>7854</MNT><IT1>VENTILADOR NOTEBOOK XY567</IT1><CAF version="1.0"><DA><RE>76010133-8</RE><RS>INGENIERÍA ZIONIT SPA</RS><TD>33</TD><RNG><D>154</D><H>155</H></RNG><FA>2022-02-25</FA><RSAPK><M>3+1l0r8WxplN+Ff3L4GwYiiwbqrHn2CVSvv12IC+pabumBKr+wGRT2iLmjHLZEi8ZtECvX/kUGNzix1XB/aHaQ==</M><E>Aw==</E></RSAPK><IDK>100</IDK></DA><FRMA algoritmo="SHA1withRSA">FGdAkA477/aZ6X/c4sGlgtNbwwUDndEcsX/nZ/asvbikdFu41JTGg9PZB5M9R01DvfgahEvFzcjso3LnuAStig==</FRMA></CAF><TSTED>2022-02-28T13:24:05</TSTED></DD>`

    let TD2 = `<DD><RE>${XMLEmisor.RUTEmisor[0]}</RE><TD>${XMLIdDoc.TipoDTE[0]}</TD><F>${XMLIdDoc.Folio[0]}</F><FE>${XMLIdDoc.FchEmis[0]}</FE><RR>${XMLReceptor.RUTRecep[0]}</RR><RSR>${XMLReceptor.RznSocRecep[0]}</RSR><MNT>${XMLEncabezado.Totales[0].MntTotal[0]}</MNT><IT1>${XMLDetalle.NmbItem[0]}</IT1>${cafToString}<TSTED>2022-02-28T13:24:05</TSTED></DD>`

    const createdHash = crypto.createHash(ENCRYPT).update(TD2);
    const hash = createdHash.digest("base64");
    const signature = crypto.privateEncrypt({key:RSASK[0], padding:crypto.constants.RSA_PKCS1_PADDING}, hash)

    // console.log(TD2)
    // console.log(TD2)
    // console.log(JSON.stringify(CAFORIGINAL[0]))

   
    // console.log(xmlAFirmar.Documento.$.ID)

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

    const signatureTag = {
        SignedInfo:{
            CanonicalizationMethod:{
                $:{"Algorithm":"http://www.w3.org/TR/2001/REC-xml-c14n-20010315"}
            },
            SignatureMethod:{
                $:{"Algorithm":"http://www.w3.org/2000/09/xmldsig#rsa-sha1"}
            },
            Reference:{
                $:{"URI":`#${xmlAFirmar.Documento.$.ID}`},
                Transforms:{
                    Transform:{
                        $:{"Algorithm":"http://www.w3.org/2000/09/xmldsig#enveloped-signature"}
                    }
                },
                DigestMethod:{
                    $:{"Algorithm":"http://www.w3.org/2000/09/xmldsig#sha1"}
                },
                DigestValue:{}
            }
        },
        SignatureValue:{ },
        KeyInfo:{
            KeyValue:{
                RSAKeyValue:{
                    Modulus:{},
                    Exponent:{}
                }
            },
            X509Data:{
                X509Certificate: c509Raw
            }
        }
    }

    Object.assign(xmlAFirmar, {Signature:signatureTag})

    const builderFinal = new xml2js.Builder({explicitRoot:false, headless:true, renderOpts:{pretty:true, newline:'\n'}});
    const xml = builderFinal.buildObject(xmlAFirmar);
    console.log(xml)
    res.status(200).json({
        ok:true, 
        msg:"HOla mundo",
        c509:c509
    })
}))


server.listen( port, () => {
    console.log(`Servidor corriendo en puerto ${port}`)
})
