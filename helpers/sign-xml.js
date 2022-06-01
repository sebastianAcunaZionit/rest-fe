const crypto = require('crypto');

const fs = require('fs');

const { SignedXml, xpath  } = require('xml-crypto');
const  select  = xpath
const moment = require('moment');
const xml2js = require('xml2js');

const { getC509Raw } = require("./c509-certificate");
const { getRSAPK } = require('./rsa-pk');
const { replaceInvalidCharacters, formatXmlJsonToString } = require('../utils/ultis');
const { DOMParser, XMLSerializer } = require('@xmldom/xmldom');
const NodeRSA = require('node-rsa');
const { XmlDocument } = require('xmldoc');

const ENCRYPT = 'RSA-SHA1';


const signDocument = async ({xmlPath, cafPath}) => {

    const stringCaf = fs.readFileSync(cafPath).toString();
    const stringXml = fs.readFileSync(xmlPath).toString();

    const cafDOM = new DOMParser().parseFromString(stringCaf, 'text/xml')
    const cxmlDOM = new DOMParser().parseFromString(stringXml, 'text/xml')

    // var document = new XmlDocument(stringCaf);
    // console.log(document)

    const AUTORIZACION = cafDOM.getElementsByTagName('AUTORIZACION')[0];

    const TED =  await setSignature(cxmlDOM, AUTORIZACION);

    const TEDObject = new DOMParser().parseFromString(TED, 'text/xml')
    


    let nuevoXML = ``;
    for(let i = 0; i <= stringXml.length; i++){
        if(stringXml.charAt(i) === '<' && stringXml.charAt(i - 1) === '>'){
            nuevoXML += '\n'+stringXml.charAt(i);
        }else{nuevoXML += stringXml.charAt(i);}
    }

    // newValue.replaceAll("  ", ' ');
    // nuevoXML = nuevoXML.replaceAll("\n", '');
    // nuevoXML = nuevoXML.replaceAll("%", '');

    // console.log(nuevoXML)

    const formatedXML = new DOMParser().parseFromString(nuevoXML, 'text/xml');
    formatedXML.getElementsByTagName('Documento')[0].appendChild(TEDObject)
    

    const earlyEndedXml = new XMLSerializer().serializeToString(formatedXML);
    const charIndex = earlyEndedXml.search('</Documento>');
    const almostXml = earlyEndedXml.substring(0, charIndex) + '\n' + earlyEndedXml.substring(charIndex);

    let DTE = `<DTE version="1.0">\n${almostXml}\n</DTE>`;
    DTE = DTE.replace('<?xml version="1.0" encoding="windows-1252"?>', '');

    return DTE;
}


const signFile = async({signedXml, certificate, nodeToSign = 'Documento', extras={parseModulus:true}, options = {explicitRoot:false, headless:true, renderOpts:{pretty:true, newline:'\n', indent:'' }}}) => { 

    
    var option = {
        implicitTransforms: ["http://www.w3.org/TR/2001/REC-xml-c14n-20010315"],
        canonicalizationAlgorithm:"http://www.w3.org/TR/2001/REC-xml-c14n-20010315",
    }
    const sig = new SignedXml(null, option)

    const c509Raw = await getC509Raw(certificate.cert);
    const rsaKeys = await getRSAPK(certificate.key, extras.parseModulus);

    const keyValue = `<KeyValue><RSAKeyValue><Modulus>${rsaKeys.n_plus}${(extras.parseModulus) ? `\n` : ``}</Modulus><Exponent>${rsaKeys.e.toString("base64")}${(extras.parseModulus) ? `\n` : ``}</Exponent></RSAKeyValue></KeyValue>`;

    sig.signingKey = certificate.key;


    sig.keyInfoProvider = {   
        getKeyInfo: (key, prefix)=> {
            prefix = prefix || ''
            prefix = prefix ? prefix + ':' : prefix
            return `${keyValue}<X509Data><X509Certificate>${c509Raw}</X509Certificate></X509Data>`;
        },
    }

    sig.addReference(`//*[local-name(.)='${nodeToSign}']`, ["http://www.w3.org/2000/09/xmldsig#enveloped-signature"])
    sig.computeSignature(signedXml);

    verifiedXml = sig.getSignedXml();
    
    return {signedXml:verifiedXml, justSign:sig.getSignatureXml()};

}


const doTheSign = async ( stringToSign,  rsask) => {
    const sign = crypto.createSign(ENCRYPT);;
    sign.write(stringToSign);
    sign.end();
    const signature = sign.sign(rsask, 'base64');
    return signature;
}




const setSignature = async ( xmlFile,  caf ) => {

    const fechaHoraActual = "2022-04-19T17:28:16";
    // const fechaHoraActual = moment().format("YYYY-MM-DDTHH:mm:ss")

    const Encabezado = xmlFile.getElementsByTagName('Encabezado')[0];
    const Detalle = xmlFile.getElementsByTagName('Detalle')[0];

    const IdDoc = Encabezado.getElementsByTagName('IdDoc')[0];
    const Emisor = Encabezado.getElementsByTagName('Emisor')[0];
    const Receptor = Encabezado.getElementsByTagName('Receptor')[0];

    const TipoDTE = IdDoc.getElementsByTagName('TipoDTE')[0].childNodes['0'].data;
    const Folio = IdDoc.getElementsByTagName('Folio')[0].childNodes['0'].data;
    const FchEmis = IdDoc.getElementsByTagName('FchEmis')[0].childNodes['0'].data;

    const RUTEmisor = Emisor.getElementsByTagName('RUTEmisor')[0].childNodes['0'].data;
    const RUTRecep = Receptor.getElementsByTagName('RUTRecep')[0].childNodes['0'].data;
    const RznSocRecep = replaceInvalidCharacters(Receptor.getElementsByTagName('RznSocRecep')[0].childNodes['0'].data);

    const MntTotal = Encabezado.getElementsByTagName('Totales')[0].getElementsByTagName('MntTotal')[0].childNodes['0'].data;
    const NmbItem = replaceInvalidCharacters(Detalle.getElementsByTagName('NmbItem')[0].childNodes['0'].data);

    let stringCAF = new XMLSerializer().serializeToString(caf.getElementsByTagName('CAF')[0]);
    const RSASK = caf.getElementsByTagName('RSASK')[0].childNodes['0'].data;

    let nuevoCAF = ``;
    for(let i = 0; i <= stringCAF.length; i++){
        if(stringCAF.charAt(i) === '\n' && stringCAF.charAt(i - 1) === '>'){}
        else{nuevoCAF += stringCAF.charAt(i);}
    }



    let TD2 = `<DD><RE>${RUTEmisor}</RE><TD>${TipoDTE}</TD><F>${Folio}</F><FE>${FchEmis}</FE><RR>${RUTRecep}</RR><RSR>${RznSocRecep}</RSR><MNT>${MntTotal}</MNT><IT1>${NmbItem}</IT1>${nuevoCAF}<TSTED>${fechaHoraActual}</TSTED></DD>`
    const signature = await doTheSign(TD2, RSASK)
    const TED = `<TED version="1.0">\n<DD>\n<RE>${RUTEmisor}</RE>\n<TD>${TipoDTE}</TD>\n<F>${Folio}</F>\n<FE>${FchEmis}</FE>\n<RR>${RUTRecep}</RR>\n<RSR>${RznSocRecep}</RSR>\n<MNT>${MntTotal}</MNT>\n<IT1>${NmbItem}</IT1>\n${nuevoCAF}<TSTED>${fechaHoraActual}</TSTED>\n</DD>\n<FRMT algoritmo="SHA1withRSA">${signature}</FRMT>\n</TED>\n<TmstFirma>${fechaHoraActual}</TmstFirma>\n`;
    return TED;
}

module.exports = {
    signFile,
    signDocument
}