

const bds = [
    {   
        bd_id:'IZ',
        bd_host:process.env.SERVER_BD,
        bd_name:process.env.BD_IZ,
        bd_user:process.env.DB_IZ_USER,
        bd_pass:process.env.DB_IZ_PASS,
        proyect_folder:process.env.PROYECT_DOCUM,
        docum_folder:process.env.DOCUM_IZ

    },
    {
        bd_id:'IZ-CERT',
        bd_host:process.env.SERVER_BD,
        bd_name:process.env.BD_IZ_CERT,
        bd_user:process.env.DB_IZ_USER,
        bd_pass:process.env.DB_IZ_PASS,
        proyect_folder:process.env.PROYECT_DOCUM,
        docum_folder:process.env.DOCUM_IZ_CERT
    },
    {
        bd_id:'DELTA-CERT',
        bd_host:process.env.SERVER_BD,
        bd_name:process.env.BD_DELTA,
        bd_user:process.env.DB_DELTA_USER,
        bd_pass:process.env.DB_DELTA_PASS,
        proyect_folder:process.env.PROYECT_DOCUM_DELTA,
        docum_folder:process.env.DOCUM_DELTA
    }

]

const getBdConection = async (action) => bds.filter( bd => bd.bd_id === action)[0];


module.exports = {
    getBdConection
}