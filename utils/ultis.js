

const Utils = {
    FOLIO_ESTADO_LIBRE: 'L',
    FOLIO_ESTADO_OCUPADO: 'O',
    FOLIO_ESTADO_NULO: 'N',
    FOLIO_INFORMADO_SI:'S',
    FOLIO_INFORMADO_NO:'N'
}


const formatRutWDots =  (rutDTE) => {
    const arrayRut  = rutDTE.split('-');
    return `${Number(arrayRut[0]).toLocaleString('es', {minimumFractionDigits: 0, maximumFractionDigits: 2})}-${arrayRut[1]}`;
}

const formatRUtWidhoutDots = (rut) =>  rut.replaceAll('.', '')



const replaceInvalidCharacters = ( text ) => {
    let newValue = ``;
    newValue = text.replaceAll("&", '&amp;');
    newValue = newValue.replaceAll("<", '&lt;');
    newValue = newValue.replaceAll(">", '&gt;');
    newValue = newValue.replaceAll("  ", ' ');
    // text = text.replaceAll('"', '&quot;');
    // text = text.replaceAll('\'', '&apos;');
    return newValue.toString('utf8');
}



const formatXmlJsonToString = ( jsonXml = {} ) => {

    let stringXml =``;
    
    const parent = Object.getOwnPropertyNames(jsonXml);

    // Object.get
    console.log(parent)
    console.log(jsonXml[parent[0]])
    // console.log(jsonXml[Object.getOwnPropertyNames(jsonXml)])

    return stringXml;
}

module.exports = {Utils, formatRutWDots, formatRUtWidhoutDots, replaceInvalidCharacters, formatXmlJsonToString};