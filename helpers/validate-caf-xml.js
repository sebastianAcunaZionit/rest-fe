
const { QueryTypes } = require("sequelize");
const moment = require("moment");
const { connectDB } = require("../database/conection");
const { getFileFromServer, getPathOfFile } = require("./validate-pass-pfx");
const { parseFileToString, parseXmlToJson } = require("./xml-parser");

// const crypto = require('crypto');

const {Utils, formatRutWDots} = require('../utils/ultis');
const FTPClient = require("../utils/FTPClient");

const validateCafXml = async ({cafPath, xmlPath}) => {

    const parsedCaf = await parseFileToString(cafPath);
    const parsedXml = await parseFileToString(xmlPath);
    const folioDesdeCaf = Number(parsedCaf.AUTORIZACION.CAF[0].DA[0].RNG[0].D[0]);
    const folioHastaCaf = Number(parsedCaf.AUTORIZACION.CAF[0].DA[0].RNG[0].H[0]);
    const folioXml = Number(parsedXml.Documento.Encabezado[0].IdDoc[0].Folio[0]);
    return (folioXml >= folioDesdeCaf && folioXml <= folioHastaCaf);

}

const validarExisteCaf = async ( xmlPath, db_conection ) => {

    const parsedXml = await parseFileToString(xmlPath);

    const folioXml = Number(parsedXml.Documento.Encabezado[0].IdDoc[0].Folio[0]);
    const rutEmisor = parsedXml.Documento.Encabezado[0].Emisor[0].RUTEmisor[0];
    const tipoDoc = Number(parsedXml.Documento.Encabezado[0].IdDoc[0].TipoDTE[0]);

    

    const db = await connectDB({options:db_conection});


    const cafBd = await db.query(` SELECT * FROM fe_caf_carga WHERE (h_valor >= :d AND d_valor <= :d) AND td_valor = :td `, {
        replacements:{ d: folioXml, td:tipoDoc },
        type:QueryTypes.SELECT
    })
    if(cafBd.length <= 0){
        db.close();
        return {
            ok:false,
            response:'No se encontro caf para este folio.'
        }
    }


    if(rutEmisor !== cafBd[0].re_valor){
        db.close();
        return {
            ok:false,
            response:`RutEmisor : ${rutEmisor} de xml no coincide con rutEmisor de caf : ${cafBd[0].re_valor}`
        }
    }


    // const foliosLibres =  await db.query(`SELECT * FROM fe_folio WHERE num_fo_fe = :folio AND tipo_doc_fe = :td AND  estado_fo = :estado `, {
    //     replacements:{ folio:folioXml, td:tipoDoc, estado: Utils.FOLIO_ESTADO_LIBRE },
    //     type:QueryTypes.SELECT
    // })

    // if( foliosLibres.length <= 0){
    //     db.close();
    //     return {
    //         ok:false,
    //         response:`El folio del xml ya no se encuentra en estado 'LIBRE'. `
    //     }
    // }
    const finalPath = await  getFileFromServer({path:cafBd[0].ruta_xml, destFolder:'xml'})

    if(!finalPath.ok){
        db.close();
        return{
            ok: false,
            response:finalPath.response
        }
    }
    db.close();
    return {
        ok:true,
        response:finalPath.response
    }
}


const duplicatedCafVerify = async (cafFile, bd_conection, usuario) => {


    try {

        const ftp =  new FTPClient('192.168.1.17', 21, 'ftp_servidor17', 'ftp_ser17', false);

        const cafPath = await getPathOfFile(cafFile, 'caf', cafFile.name);
        const parsedCaf = await parseFileToString(cafPath.response);
    
        const dateTime = moment().format('yyyy-MM-DD HH:mm:ss')
    
    
        const RASK = parsedCaf.AUTORIZACION.RSASK[0];
        const RSAPUBK = parsedCaf.AUTORIZACION.RSAPUBK[0];
        const FRMA  = parsedCaf.AUTORIZACION.CAF[0].FRMA[0]._;
        const RE  = parsedCaf.AUTORIZACION.CAF[0].DA[0].RE[0];
        const RS  = parsedCaf.AUTORIZACION.CAF[0].DA[0].RS[0];
        const TD  = parsedCaf.AUTORIZACION.CAF[0].DA[0].TD[0];
        const FA  = parsedCaf.AUTORIZACION.CAF[0].DA[0].FA[0];
        const IDK  = parsedCaf.AUTORIZACION.CAF[0].DA[0].IDK[0];
        const D  = Number(parsedCaf.AUTORIZACION.CAF[0].DA[0].RNG[0].D[0]);
        const H  = Number(parsedCaf.AUTORIZACION.CAF[0].DA[0].RNG[0].H[0]);
        const M  = parsedCaf.AUTORIZACION.CAF[0].DA[0].RSAPK[0].M[0];
        const E  = parsedCaf.AUTORIZACION.CAF[0].DA[0].RSAPK[0].E[0];
        const VERSION = parsedCaf.AUTORIZACION.CAF[0].$.version;
    
        // const cafInString2 = await parseXmlToJson(parsedCaf.AUTORIZACION.CAF[0].DA[0], {explicitRoot:false, rootName:'DA', headless:true, renderOpts:{pretty:false}});
        // const TD2 = `<DA><RE>${RE}</RE><RS>${RS}</RS><TD>${TD}</TD><RNG><D>${D}</D><H>${H}</H></RNG><FA>${FA}/FA><RSAPK><M>${M}</M><E>${E}</E></RSAPK><IDK>${IDK}</IDK></DA>`
        // console.log(parsedCaf.AUTORIZACION.CAF[0].FRMA)
        // console.log(RASK)
        // console.log(TD2)
        

        // const createdHash = crypto.createHash('RSA-SHA1').update(TD2);
        // const hash = createdHash.digest("base64");
        // console.log(hash)
        // const signature = crypto.privateEncrypt({key:RASK, padding:crypto.constants.RSA_PKCS1_PADDING}, hash)

        // // console.log(cafInString2)
        // console.log(signature.toString('base64'), FRMA)
        // const verifier = crypto.createVerify('RSA-SHA1')
        // verifier.update(TD2);
        // const resultado = verifier.verify(RASK, signature.toString('base64'));

        // console.log({resultado})
        // return {
        //     ok:false,
        //     response:`todo gucci`
        // }
    
        if(H<D || H <= 0 || D <= 0){
            return {
                ok:false,
                response:`Folios hasta no pueden ser menores que folios desde y estos no pueden ser menores o iguales a 0 `
            }
        }
    
        const cafInString = await parseXmlToJson(parsedCaf.AUTORIZACION.CAF[0], {explicitRoot:false, rootName:'CAF', headless:true, renderOpts:{pretty:false}});
        const xmlToString = await parseXmlToJson(parsedCaf, {explicitRoot:false, headless:true, renderOpts:{pretty:false}});
    
    
        const db = await connectDB({options:bd_conection});
    
    
        const rutWithDots = formatRutWDots(RE);
        const existeEmpresa = await db.query(`SELECT * FROM empresa WHERE rut_empre = :rut_empre `, {
            replacements:{ rut_empre: `${rutWithDots}` },
            type:QueryTypes.SELECT
        })
    
        if(existeEmpresa.length <= 0){
            db.close();
            return {
                ok:false,
                response:`El RUT del Emisor '${RE}' No coincide con el rut de la empresa `
            }
        }
    
    
        const existeCaf = await db.query(`SELECT * FROM fe_caf_carga WHERE td_valor = :td AND d_valor = :d AND h_valor = :h `, {
            replacements:{ td:TD, d:D, h:H },
            type:QueryTypes.SELECT
        });
    
        if(existeCaf.length > 0){
            db.close();
            return {
                ok:false,
                response:`Los Folios D:${D} y H:${H} para el tipo de documento : ${TD} ya se encuentran registrados en el sistema `
            }
        }
    
    
        const existenFolios = await db.query(`SELECT * FROM fe_folio WHERE tipo_doc_fe = :td AND num_fo_fe BETWEEN :d AND :h `, {
            replacements:{ td: TD, d:D, h:H },
            type:QueryTypes.SELECT
        });
    
        if(existenFolios.length > 0){
            db.close();
            return {
                ok:false,
                response:`Los Folios D:${D} y H:${H} para el tipo de documento : ${TD} ya se encuentran registrados en el sistema `
            }
        }


        const [lastIdInserted, result] = await db.query(`INSERT INTO fe_caf_carga ( user_tx, fecha_hora_tx, td_valor, d_valor, h_valor  ) 
        VALUES ( :user_tx,  :fecha_hora_tx, :td_valor,:d_valor, :h_valor  )`, 
       {  replacements:{ user_tx:usuario.rut_user, fecha_hora_tx:dateTime,td_valor:TD,  d_valor:D , h_valor:H },  type:QueryTypes.INSERT  });
    
       if(lastIdInserted <= 0){
           db.close();
           return {
                ok:false,
                response:`No se pudo obtener el ultimo elemento insertado, por favor, vuelva a intentarlo`
           }
       }

       
        const existeCaf2 = await db.query(`SELECT * FROM fe_caf_carga WHERE td_valor = :td AND d_valor = :d AND h_valor = :h `, {
            replacements:{ td:TD, d:D, h:H },
            type:QueryTypes.SELECT
        });
    
        if(existeCaf2.length != 1){

            await db.query(`DELETE FROM fe_caf_carga WHERE id_carga = :id `, {
                replacements:{ id:lastIdInserted },
                type:QueryTypes.DELETE
            })

            db.close();
            return {
                ok:false,
                response:`Ya se encuentran los folios registrados, por favor compruebe las cargas CAF y vuelva a intentarlo. `
            }
        }


        const nombreNuevoXml = `CARGA_XML_AUMENT_${lastIdInserted}.xml`;
        const pathToSetCaf = `${bd_conection.docum_folder}/fe/caf/${nombreNuevoXml}`;

        const uploadFile = await ftp.upload(cafPath.response, `/srv/www/htdocs/${pathToSetCaf}`, 755)

        if(!uploadFile.ok){
            await db.query(`DELETE FROM fe_caf_carga WHERE id_carga = :id `, {
                replacements:{ id:lastIdInserted },
                type:QueryTypes.DELETE
            });
            db.close();
            return {
                ok:false,
                response:uploadFile.message
            }
        }
    
        const rutaXml = `../../${pathToSetCaf}`;
    
        const objToInsert = {
            version_caf:VERSION, 
            re_valor:RE,
            rs_valor:RS,
            fa_valor:FA, 
            m_valor:M,
            e_valor:E, 
            idk_valor:IDK,
            frma_valor:FRMA,  
            rsask_valor:RASK,
            rsapubk_valor:RSAPUBK,   
            ruta_xml:rutaXml, 
            nombre_xml:cafFile.name,   
            caf_valor:cafInString,  
            valor_valor:xmlToString,
            id_carga:lastIdInserted
        }
    
        await db.query(`UPDATE fe_caf_carga SET
                version_caf = :version_caf,
                re_valor = :re_valor,
                rs_valor = :rs_valor,
                fa_valor = :fa_valor,
                m_valor = :m_valor,
                e_valor = :e_valor,
                idk_valor = :idk_valor,
                frma_valor = :frma_valor,
                rsask_valor = :rsask_valor,
                rsapubk_valor = :rsapubk_valor,
                ruta_xml = :ruta_xml,
                nombre_xml = :nombre_xml,
                caf_valor = :caf_valor,
                valor_valor = :valor_valor
            WHERE id_carga = :id_carga
        `, { replacements:objToInsert,  type:QueryTypes.UPDATE }
       )


       let insertedFolios = 0;
       let sumaTotalFolios = 0
       for(let i = D; i <= H; i++ ){
             await db.query(`INSERT INTO fe_folio 
            ( id_carga,  num_fo_fe , estado_fo, informado, tipo_doc_fe  ) 
            VALUES ( :id_carga,  :num_fo_fe , :estado_fo, :informado, :tipo_doc_fe )`, {
                replacements:{ id_carga:lastIdInserted ,  num_fo_fe:i , estado_fo:Utils.FOLIO_ESTADO_LIBRE, informado: Utils.FOLIO_INFORMADO_NO, tipo_doc_fe: TD },
                type:QueryTypes.INSERT
            });
            insertedFolios++;
            sumaTotalFolios+= (insertedFolios + i);
       }

       const cantidadFolios = await db.query(`SELECT * FROM fe_folio WHERE id_carga = :id_carga `, {
           replacements:{ id_carga:lastIdInserted  },
           type:QueryTypes.SELECT
       })

        let insertedFoliosSql = 0;
        let contadorSqlFOlio = 0;
        for (const folio of cantidadFolios) {
            contadorSqlFOlio++;
            insertedFoliosSql+=  Number(folio.num_fo_fe) + (contadorSqlFOlio);
        }

       if(insertedFoliosSql !== sumaTotalFolios){
            await db.query(`DELETE FROM fe_caf_carga WHERE id_carga = :id `, {
                replacements:{ id:lastIdInserted },
                type:QueryTypes.DELETE
            });

            await db.query(`DELETE FROM fe_folio WHERE id_carga = :id `, {
                replacements:{ id:lastIdInserted },
                type:QueryTypes.DELETE
            })

            db.close();
            return {
                ok:false,
                response:`No se pudo comprobar la integridad de los folios agregados, por favor, vuelva a intentarlo.`
            }
       }

        db.close();
        return {
            ok:true,
            response:cafPath.response
        }
        
    } catch (error) {
        return {
            ok:false,
            response:`Problemas en la funcion [duplicatedCafVerify]  error: ${error}`
        }
    }

    
}


module.exports = {
    validateCafXml,
    validarExisteCaf,
    duplicatedCafVerify
}