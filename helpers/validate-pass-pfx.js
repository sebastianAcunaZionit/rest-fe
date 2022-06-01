const fs = require('fs');
const { default: axios } = require('axios');
const { v4: uuidv4 } = require('uuid');
const pem = require("pem");
const moment = require('moment')

pem.config({  pathOpenSSL: 'C:/Program Files/Git/usr/bin/openssl.exe' })

const { subirArchivo } = require("./archivos");
const { Blob } = require('buffer');


const getFilenameArray = (filename) => {

    const filenameArray =  filename.split('/');
    const filenameExtension = filenameArray[filenameArray.length - 1].split('.');
    filenameArray.slice(-1);
    return [ ...filenameArray, ...filenameExtension ];
}

const getPathOfFile = async (file, folder, filename) => {

    filename = filename.split('.');
    filename = filename[0];

    const filenameArray = getFilenameArray(file.name);
    const newFilename = `${filename}.${filenameArray[filenameArray.length - 1]}`;

    const filePath = await subirArchivo({archivo:file}, [filenameArray[filenameArray.length - 1]], folder , newFilename).catch( reason => reason);
    return filePath;
}


const getFileFromServer = async ( {path, destFolder = 'pfx'} ) => {

    
    try {
        const ruta_fm = path.replaceAll('../', '');
        const filenameArray = getFilenameArray(ruta_fm);
        const newPath = `./uploads/${destFolder}/${filenameArray[filenameArray.length - 2]}.${filenameArray[filenameArray.length - 1]}`;
        const writer = fs.createWriteStream(newPath);
       
        const { data }  = await axios.get(`${process.env.HTTP}${process.env.SERVER_IP}/${ruta_fm}`, { responseType:'stream'})

        data.pipe(writer);
        
        return new Promise( resolve => {
            writer.on('finish', () => {  console.log('escribiendo...');  resolve({ok:true,  response:newPath});});
        })
       
    } catch (error) {
        const {response} = error
        return {
            ok:false,
            response:`No se pudo obtener archivo, codigo : ${response?.status | `${error}`}`
        }
    }

}

const pfxPassValidator = async (filePath, password) => {

    const pfxFile = fs.readFileSync(filePath)
    return new Promise( (resolve, reject) => {
        pem.readPkcs12(pfxFile, { p12Password: password}, (err, cert) => {
            if(err){
                const msg = (err.toString().indexOf('password') >= 0) ? 'Contraseña invalida.' : err;
                resolve({ok:false, response:msg})
            }
            resolve({ok:true, response:cert})
        })
    })

}

const getCertificateInfo = async (cert) => {
    return new Promise( (resolve, reject) => {
        pem.readCertificateInfo(cert, (error, resultado) => {
            if(error){ resolve({ok:false, response:'Error en ' + error})}
            if(!moment().isBetween(moment(resultado.validity.start), moment(resultado.validity.end) )){
                resolve({ok:false, response:`Validez de PFX no se encuentra entre las fechas ${moment(resultado.validity.start).format('DD-MM-YYYY')} y ${moment(resultado.validity.end).format('DD-MM-YYYY')}`})
            }
            resolve({ok:true})
        })
    })
} 


module.exports = {
    getPathOfFile,
    pfxPassValidator,
    getFileFromServer,
    getCertificateInfo
}
