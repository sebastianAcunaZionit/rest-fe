const { default: axios } = require('axios');
const fs = require('fs');
const { v4: uuidv4 } = require('uuid');
const FormData = require('form-data');

const SoapClient = require("../api/soap-connection");
const { signFile } = require('./sign-xml');
const { parseFileToString } = require('./xml-parser');
const { formatRUtWidhoutDots } = require('../utils/ultis');
const { XMLSerializer, DOMParser } = require('@xmldom/xmldom');



const sendToSII = async ({usuario, certificate, signedXmlPath }) => {

    const trackId = await getTrackID(certificate);

    if(!trackId.ok) return trackId;
    
    // const signedXml = await parseFileToString(signedXmlPath);
    const fisicalxml = fs.readFileSync(signedXmlPath, {encoding:"ascii"})
    const stringXml = new DOMParser().parseFromString(fisicalxml, 'text/xml')

   

    const rutEmisor = stringXml.getElementsByTagName('EnvioDTE')[0].getElementsByTagName('SetDTE')[0].getElementsByTagName('Caratula')[0].getElementsByTagName('RutEmisor')[0].childNodes['0'].data;
    const rutEnvia = formatRUtWidhoutDots(usuario.rut_user);

    
    
    // const form = new FormData();

    const boundary = '7d23e2a11301c4';
    // form.setBoundary(boundary)

    const pathFileArray = signedXmlPath.split('/');
    const nameOfFile = pathFileArray[pathFileArray.length - 1];

    // const realPath = fs.realpathSync(signedXmlPath)

    // console.log(realPath)
    // console.log(signedXmlPath)


    // const {size: sizeFile} = fs.statSync(signedXmlPath);

    const stringFile = fs.readFileSync(signedXmlPath, {encoding:'ascii'})

    // console.log(stringFile)
    // form.append('rutSender', rutEnvia.split('-')[0]);
    // form.append('dvSender',  rutEnvia.split('-')[1]);
    // form.append('rutCompany', rutEmisor.split('-')[0]);
    // form.append('dvCompany', rutEmisor.split('-')[1]);
    // form.append('archivo', stringFile+"\r\n\r\n", { contentType:'text/xml', filename:nameOfFile, knownLength:sizeFile});
    // form.append('archivo', fs.createReadStream(signedXmlPath), { contentType:'text/xml', filename:nameOfFile, knownLength:sizeFile});
    

    let envio = ``;
    envio+= `--${boundary}\r\nContent-Disposition: form-data; name="rutSender"\r\n\r\n${rutEnvia.split('-')[0]}\r\n`;
    envio+= `--${boundary}\r\nContent-Disposition: form-data; name="dvSender"\r\n\r\n${rutEnvia.split('-')[1]}\r\n`;
    envio+= `--${boundary}\r\nContent-Disposition: form-data; name="rutCompany"\r\n\r\n${rutEmisor.split('-')[0]}\r\n`;
    envio+= `--${boundary}\r\nContent-Disposition: form-data; name="dvCompany"\r\n\r\n${rutEmisor.split('-')[1]}\r\n`;
    envio+= `--${boundary}\r\nContent-Disposition: form-data; name="archivo"; filename="${nameOfFile}"\r\nContent-Type:text/xml\r\n\r\n${stringFile}\r\n\r\n`;
    envio+= `--${boundary}--\r\n`;


    const bodyLength = envio.length;


    try {
        const axiosResponse = await axios.post(`https://${process.env.SII_SERVER}.sii.cl/cgi_dte/UPL/DTEUpload`,envio, {
            
            headers:{
                "POST":"/cgi_dte/UPL/DTEUpload HTTP/1.0",
                "Expect":"",
                "accept":"image/gif, image/x-xbitmap, image/jpeg, image/pjpeg, application/vnd.ms-powerpoint, application/ms-excel, application/msword, */*", 
                "Referer": `http://192.168.1.17/iz/fe/`,
                "Accept-Language":"es-cl",
                "Accept-Encoding":"gzip, deflate",
                "Content-Type":`multipart/form-data: boundary=${boundary}`,
                "User-Agent":"Mozilla/4.0 (compatible; PROG 1.0; Windows NT 5.0; YComp 5.0.2.4)",
                "Content-Length":`${bodyLength}`,
                "Connection":"keep-Alive",
                "Cache-Control":"no-cache",
                "Cookie":`TOKEN=${trackId.response}`
            }
        })
        console.log(axiosResponse.data)
    } catch (error) {

        console.log(error)
        
    }
}


const getTrackID = async (certificate) => {
    const something = await getToken(certificate);

    const clienteSOAP = new SoapClient(process.env.SII_SERVER);
    const trackIdResponse  = await clienteSOAP.getTokenBySeedClient(something);

    fs.writeFileSync('./uploads/api/trackId.xml', trackIdResponse.getTokenReturn["$value"])

    const trackIdJson = await parseFileToString('./uploads/api/trackId.xml');

    if(trackIdJson['SII:RESPUESTA']['SII:RESP_HDR'][0]['ESTADO'][0] !== '00'){
        return {
            ok:false,
            response:`${trackIdJson['SII:RESPUESTA']['SII:RESP_HDR'][0]['GLOSA'][0]}`
        }
    }

    return {
        ok:true,
        response:trackIdJson['SII:RESPUESTA']['SII:RESP_BODY'][0]['TOKEN'][0]
    };
}



const getSeed = async () => {
    const clienteSOAP = new SoapClient(process.env.SII_SERVER);
    const semilla  = await clienteSOAP.getSeedClient();
    const nameOfResponse = `./uploads/api/seedResponse_${uuidv4()}.xml`;
    fs.writeFileSync(nameOfResponse, semilla.getSeedReturn[`$value`]);
    return nameOfResponse;
}



const getToken = async (certificate) => {

    const seedResponsePath  = await getSeed();

    const seedJson = await parseFileToString(seedResponsePath);

    if(seedJson[`SII:RESPUESTA`]['SII:RESP_HDR'][0].ESTADO[0] === '00'){
        const xmlToken = `<getToken>\n\t<item>\n\t\t<Semilla>${seedJson[`SII:RESPUESTA`]['SII:RESP_BODY'][0].SEMILLA[0]}</Semilla>\n\t</item>\n</getToken>`;
        // const nameOfResponse = `./uploads/api/tokenRequest_${uuidv4()}.xml`;
        // fs.writeFileSync(nameOfResponse, xmlToken);
        // const parsedXml = await parseFileToString(nameOfResponse);

        const { signedXml:signedDocument} = await signFile({signedXml:xmlToken, certificate:certificate, nodeToSign:"item"});
        fs.rmSync(seedResponsePath);
        
        return signedDocument;
    }

    return null;
}


module.exports = {
    getSeed,
    getToken,
    getTrackID,
    sendToSII
}