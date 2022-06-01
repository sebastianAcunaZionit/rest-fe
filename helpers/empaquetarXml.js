const  {formatRutWDots, formatRUtWidhoutDots} = require("../utils/ultis");
const { getEmpresa } = require("./get-empresa");
const moment = require('moment');
const { DOMParser, XMLSerializer } = require("@xmldom/xmldom");
const { JSDOM } = require("jsdom");
const fs = require('fs');
const { XMLParser, XMLBuilder, XMLValidator} = require("fast-xml-parser");

const emisorDistinto = async (dtes = [], db_conection) => {

    const empresa = await getEmpresa(db_conection);


    const errores = dtes.filter( 
        dte => 
        formatRutWDots(dte.object.getElementsByTagName('DTE')[0].getElementsByTagName('Documento')[0].getElementsByTagName('Encabezado')[0].getElementsByTagName('Emisor')[0].getElementsByTagName('RUTEmisor')[0].childNodes['0'].data)
        !== empresa.rut_empre
    );

    if(errores.length> 0){
        return {
            ok:false,
            response:`El/Los siguientes RUTEmisor no coinciden con el RUT de la empresa : ${errores.map( err => err.getElementsByTagName('Documento')[0].getElementsByTagName('Encabezado')[0].getElementsByTagName('Emisor')[0].getElementsByTagName('RUTEmisor')[0].childNodes['0'].data ).join(',')}`
        }
    }

    return { ok:true  }
}


const empaquetarXML = async (dtePaths = [], db_conection, usuario) => {

    const empresa = await getEmpresa(db_conection);

    if( dtePaths.length <= 0 ) return { ok:false, response:'Debe incluir al menos un path' };

    const dteArray = [];
    for (const path of dtePaths) {
        // const stringedXml = fs.readFileSync(path).toString();

        // const prueba = new JSDOM(stringedXml, {contentType:'application/xml'})
        // // console.log(prueba)
        // const XMLSerializer_ctor = XMLSerializer.interface;
        // const serializer = new XMLSerializer_ctor();
        // const outputXml = serializer.serializeToString(prueba.window.document);

    

        const cxmlDOM = new DOMParser().parseFromString(path, 'application/xml')
        // console.log(cxmlDOM)
        dteArray.push({object:cxmlDOM, stringed:path});
    }
    // for (const path of dtePaths) {
    //     const stringedXml = fs.readFileSync(path).toString();
    //     const cxmlDOM = new DOMParser().parseFromString(stringedXml, 'text/xml')
        
    //     dteArray.push(cxmlDOM);
    // }

    
    const hayDistintos = await emisorDistinto(dteArray, db_conection);
    
    const rutReceptor = '60803000-K';
    // const rutReceptor = dteArray[0].DTE.Documento[0].Encabezado[0].Receptor[0].RUTRecep[0];
    
    if(!hayDistintos.ok){
        return hayDistintos;
    }
    
    // const DTE = dteArray.map( map => map.DTE)
    
    const subTotDteArray = [];
    let StingDtes = ``;
    let contDTE = 0;
    for (const sdte of dteArray) {
        
        const TipoDTE = sdte.object.getElementsByTagName('Documento')[0].getElementsByTagName('Encabezado')[0].getElementsByTagName('IdDoc')[0].getElementsByTagName('TipoDTE')[0].childNodes['0'].data;
        const existe = subTotDteArray.filter( el => el.TpoDTE === TipoDTE);
        
        if(existe.length > 0){
            existe[0].NroDTE =   existe[0].NroDTE + 1;
        }else{
            subTotDteArray.push({TpoDTE:TipoDTE, NroDTE:1})
        }
        contDTE++;

        let salto = (contDTE < dteArray.length) ? `\n` : ``;
        // StingDtes += new XMLSerializer().serializeToString(sdte)+salto;
        StingDtes+= sdte.stringed

    }
    
    console.log({StingDtes})
    let SubTotDTE = ``;
    for (const tot of subTotDteArray) {
        SubTotDTE += `<SubTotDTE>\n<TpoDTE>${tot.TpoDTE}</TpoDTE>\n<NroDTE>${tot.NroDTE}</NroDTE>\n</SubTotDTE>\n`;
    }
    // ${moment().format('YYYY-MM-DDTHH:mm:ss')}<?xml version="1.0" encoding="ISO-8859-1"?>\n${StingDtes}
    //se creara solo el setDte para firmar.
    const Envio = `<EnvioDTE version="1.0" xmlns="http://www.sii.cl/SiiDte" xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance"  xsi:schemaLocation="http://www.sii.cl/SiiDte EnvioDTE_v10.xsd"><SetDTE ID="SetDoc"><Caratula version="1.0"><RutEmisor>${formatRUtWidhoutDots(empresa.rut_empre)}</RutEmisor><RutEnvia>${formatRUtWidhoutDots(usuario.rut_user)}</RutEnvia><RutReceptor>${rutReceptor}</RutReceptor><FchResol>${empresa.cerfechares}</FchResol><NroResol>${empresa.cernumerores}</NroResol><TmstFirmaEnv>2022-04-19T17:28:24</TmstFirmaEnv>${SubTotDTE}</Caratula></SetDTE></EnvioDTE>`;
    

    // fs.writeFileSync('./docs/test1.xml', empaquetado);

    // const ll = fs.readFileSync('./docs/test1.xml').toString();
    // const cxmlDOM = new DOMParser().parseFromString(ll, 'text/xml');

    // let DTES = ``;
    // for (const sdte of dteArray) {
    //     // console.log(sdte.characterSet = 'ISO-8859-1')
    //     // cxmlDOM.getElementsByTagName('SetDTE')[0].appendChild(sdte);
    //     DTES+= sdte.stringed

    // }
    const empaquetado = `<EnvioDTE version="1.0" xmlns="http://www.sii.cl/SiiDte" xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance"  xsi:schemaLocation="http://www.sii.cl/SiiDte EnvioDTE_v10.xsd">\n<SetDTE ID="SetDoc">\n<Caratula version="1.0">\n<RutEmisor>${formatRUtWidhoutDots(empresa.rut_empre)}</RutEmisor>\n<RutEnvia>${formatRUtWidhoutDots(usuario.rut_user)}</RutEnvia>\n<RutReceptor>${rutReceptor}</RutReceptor>\n<FchResol>${empresa.cerfechares}</FchResol>\n<NroResol>${empresa.cernumerores}</NroResol>\n<TmstFirmaEnv>2022-04-19T17:28:24</TmstFirmaEnv>\n${SubTotDTE}</Caratula>\n${StingDtes}</SetDTE>\n</EnvioDTE>`;

    // const earlyEndedXml = new XMLSerializer().serializeToString(cxmlDOM);
    
    // fs.rmSync('./docs/test1.xml')
    
    return empaquetado;
}

module.exports = {
    empaquetarXML
}