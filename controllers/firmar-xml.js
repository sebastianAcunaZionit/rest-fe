const fs = require('fs')

// const { decryptManagment } = require("../helpers/encryption-managment");
const { signDocument, signFile } = require("../helpers/sign-xml");
const { getPathOfFile, pfxPassValidator, getFileFromServer, getCertificateInfo } = require("../helpers/validate-pass-pfx");

const httpResponses = require("../utils/htttp-responses");
const { validarExisteCaf } = require('../helpers/validate-caf-xml');
const { empaquetarXML } = require('../helpers/empaquetarXml');
const { sendToSII } = require('../helpers/siiRequests');
// const { DOMParser, XMLSerializer } = require('xmldom');
const { DOMParser, XMLSerializer } = require('@xmldom/xmldom');
var xmldoc = require('xmldoc');



const doSignXml = async (req, res) => {

    const { files } = req;
    const { usuario, bd_conection } = req;

    
    if(!files){
        return res.status(httpResponses.HTTP_BAD_REQUEST).json({
            ok:false,
            response:'Debes incluir el archivo xml para poder firmarlo'
        })
    }
    const {xml} = files; 

    if(!xml){
        return res.status(httpResponses.HTTP_BAD_REQUEST).json({
            ok:false,
            response:'Debes incluir el archivo xml para poder firmarlo'
        })
    }

    
    const getPfx = await getFileFromServer({path:usuario.ruta_frm_elect, destFolder:'pfx'});
    if(!getPfx.ok){
        return res.status(httpResponses.HTTP_INTERNAL_SERVER_ERROR).json({
            ok:false,
            response:`${getPfx.response}`
        })
    }

    

    const pass_pfx = usuario.clave_dte;

    const isPfxValid = await pfxPassValidator(getPfx.response, pass_pfx).catch( reason => reason);
    if(!isPfxValid.ok){
        return res.status(httpResponses.HTTP_BAD_REQUEST).json({
            ok:false,
            response: isPfxValid.response
        })
    }

    const pfxInfo = await getCertificateInfo(isPfxValid.response.cert)
    if(!pfxInfo.ok){
        return res.status(httpResponses.HTTP_BAD_REQUEST).json({
            ok:false,
            response: pfxInfo.response
        })
    }

    const pathOfXml = await  getPathOfFile(xml, 'xml', 'xml_file_test').catch( reason => reason);
    if(!pathOfXml.ok){
        return res.status(httpResponses.HTTP_INTERNAL_SERVER_ERROR).json({
            ok:false,
            response:pathOfXml.response
        })
    }

    const  pathOfCaf =  await validarExisteCaf(pathOfXml.response, bd_conection);
    if(!pathOfCaf.ok){
        return res.status(httpResponses.HTTP_BAD_REQUEST).json({
            ok:false,
            response: pathOfCaf.response
        })
    }


    const signedDocument = await signDocument({xmlPath:pathOfXml.response, cafPath:pathOfCaf.response} );

    const {signedXml:finalXml, justSign} = await signFile({signedXml:signedDocument, certificate: isPfxValid.response });

    // console.log(finalXml)
    const cxmlSign = new DOMParser().parseFromString(justSign, 'text/xml')
    const cxmlDOM = new DOMParser().parseFromString(signedDocument, 'text/xml')
    
    cxmlDOM.getElementsByTagName('DTE')[0].appendChild(cxmlSign);
    const earlyEndedXml = new XMLSerializer().serializeToString(cxmlDOM);
    fs.writeFileSync(`./docs/signed/pre_${xml.name}`, finalXml);

    // hasta aca estan exactamente iguales. pre_${nombre}.xml contiene el documento firmado y estampado, falta empaquetarlo
    // `./docs/signed/pre_${xml.name}`
    const packedDocument = await empaquetarXML([finalXml], bd_conection, usuario);
    
    fs.writeFileSync(`./docs/signed/semi_package_${xml.name}`, packedDocument);

    // let rtyy = fs.readFileSync(`./docs/signed/semi_package_${xml.name}`).toString();

    // let dteMod = rtyy.replaceAll('<SetDTE ID="SetDoc">', '<SetDTE xmlns="http://www.sii.cl/SiiDte" ID="SetDoc">')

    // console.log(dteMod)
    let {signedXml:packedSignDocument, justSign:signedFinal}  = await signFile({signedXml:packedDocument,certificate:isPfxValid.response, nodeToSign:'SetDTE' })
    
    // const Envio = `<EnvioDTE version="1.0" xmlns="http://www.sii.cl/SiiDte" xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance"  xsi:schemaLocation="http://www.sii.cl/SiiDte EnvioDTE_v10.xsd">\n${rtyy}\n${signedFinal}</EnvioDTE>`;
    fs.writeFileSync(`./docs/signed/E_${xml.name}`, `<?xml version="1.0" encoding="ISO-8859-1"?>\n${packedSignDocument}\n`);

    // const finalDocument = fs.readFileSync(`./docs/signed/EP_${xml.name}`).toString();
    
    // const signatureParsed = new DOMParser().parseFromString(signedFinal, 'text/xml')
    // const finalDocumentParsed = new DOMParser().parseFromString(finalDocument, 'text/xml')
    // const SetDTEParsed = new DOMParser().parseFromString(rtyy, 'text/xml')



    // finalDocumentParsed.getElementsByTagName('EnvioDTE')[0].appendChild(SetDTEParsed);
    // finalDocumentParsed.getElementsByTagName('EnvioDTE')[0].appendChild(signatureParsed);

    // const earlyEndedXml2 = new XMLSerializer().serializeToString(finalDocumentParsed);
    
    
    // packedSignDocument = packedSignDocument.replaceAll('Signature xmlns="http://www.w3.org/2000/09/xmldsig#"', 'Signature');
//     packedSignDocument = `<?xml version="1.0" encoding="ISO-8859-1"?>
// ${packedSignDocument}`

    // const parsedCaf = await parseFileToString(pathOfCaf.response);
    // const stringedCaf = await parseXmlToJson(parsedCaf.AUTORIZACION.CAF[0],  {explicitRoot:false, strict:true, rootName:'CAF', headless:true,  renderOpts:{pretty:false}})
    


    // const positionA1 = packedSignDocument.search('<CAF version="1.0">')
    // const positionB1 = packedSignDocument.search('</CAF>')
    // let nuevoTexto1 = packedSignDocument.slice(positionA1, positionB1 + 7)
    // packedSignDocument = packedSignDocument.replace(nuevoTexto1, `${stringedCaf}`)

    // const positionA = packedSignDocument.search('<Signature xmlns="http://www.w3.org/2000/09/xmldsig#">')
    // const positionB = packedSignDocument.search('</Signature>')
    // let signature = packedSignDocument.slice(positionA, positionB + 13)
    // let newSignature = signature.replace(/\n|\r/g, "");
    // packedSignDocument = packedSignDocument.replace(signature, `${justSign}`)
    // console.log("======>", packedSignDocument)
    

    

    
    // fs.writeFileSync(`./docs/signed/E_${xml.name}`, `<?xml version="1.0" encoding="ISO-8859-1"?>\n${Envio}\n`);
    // console.log(packedSignDocument)
    


    //TODO: falta enviarlo a ftp y guardar tema relacionado a el empaquetado.

    fs.rmSync(pathOfCaf.response)
    fs.rmSync(getPfx.response)
    fs.rmSync(pathOfXml.response)


    // const envioSII = await sendToSII({usuario:usuario, certificate:isPfxValid.response, signedXmlPath:`./docs/signed/E_${xml.name}`})
    // console.log(envioSII)/
    return res.status(httpResponses.HTTP_OK).json({
        ok:true,
        response:''
    })
}



module.exports = {
    doSignXml
}