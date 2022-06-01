const { Sequelize } = require('sequelize')

const connectDB = async ({options}) => {

    try {
        const conexion = new Sequelize(options.bd_name, options.bd_user, options.bd_pass, {
            host:options.bd_host,
            dialect:'mariadb',
            timezone:'America/Santiago'
        });

        console.log("Custom Databases Online...")
        await conexion.authenticate();

        return conexion;
    } catch (error) {
        throw new Error( error );
    }
}



module.exports = {connectDB};