const fs  = require('fs')
const xml2js = require('xml2js');


const parseFileToString = async (filePath) => {
    const parser = new xml2js.Parser()
    const fileToparse =  fs.readFileSync(filePath);
    const parsedFile = await parser.parseStringPromise(fileToparse);
    return parsedFile;
}

const parseXmlToJson = async (fileToTransform, options = {explicitRoot:false, headless:true, renderOpts:{pretty:false}}) => {
    const builder = new xml2js.Builder(options);
    return builder.buildObject(fileToTransform);
}

module.exports = {
    parseFileToString,
    parseXmlToJson
}