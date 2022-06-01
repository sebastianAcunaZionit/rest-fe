const { QueryTypes } = require("sequelize");
const { connectDB } = require("../database/conection")


const getEmpresa = async (bd_conection) => {

    const db = await connectDB( { options: bd_conection });

    const empresa =await  db.query(`SELECT * FROM empresa WHERE id_empre = 1; `, {
        type:QueryTypes.SELECT
    });

    db.close();

    return empresa[0];
}

module.exports = {
    getEmpresa
}