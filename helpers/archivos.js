const { v4: uuidv4 } = require('uuid');
const path = require('path');
const fs = require('fs')



const subirArchivo = ( files, extensionesValidas =  [ 'png','jpg', 'jpeg', 'gif', 'tiff'], carpeta = '', nombreArchivo = '' ) => {


    return new Promise( (resolve, reject) => {

        const { archivo } = files;

        const nombreCortado = archivo.name.split('.');
        const extension = nombreCortado[ nombreCortado.length - 1 ];
    
        //validar la extension
        if( !extensionesValidas.includes( extension )){
            return reject(` la extension ${extension} no es permitida, las permitidas son [ ${extensionesValidas} ] `);
        }

        if(!fs.existsSync(path.join(__dirname, '../uploads/', carpeta))){
            fs.mkdirSync(path.join(__dirname, '../uploads/', carpeta));
        }
    
        const nombreTemp = (nombreArchivo != '') ? nombreArchivo :  uuidv4() + '.' + extension;
        const uploadPath = path.join(__dirname, '../uploads/', carpeta , nombreTemp);
    
        // Use the mv() method to place the file somewhere on your server
        archivo.mv(uploadPath, (err) => {
            if (err){  reject({ok:false, response:err}); }
            resolve({ok:true, response:uploadPath});
        });
    });
}


module.exports = {
    subirArchivo
}