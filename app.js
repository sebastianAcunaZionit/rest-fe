require('dotenv').config()

const express  = require("express");
const cors = require('cors');
const fileUpload = require('express-fileupload');

const app = express();
const server = require("http").createServer( app );
const port = process.env.PORT;
const uniquePath = {
    fe: `/api/fe`,
    auth: `/api/auth`,
    caf:`/api/caf`
};

app.use( cors() );
app.use( express.json() );
app.use( express.static('public') );
app.use(fileUpload({
    useTempFiles: true,
    tempFileDir: '/tmp/'
}))


app.use(uniquePath.fe, require('./router/firma-electronica'))
app.use(uniquePath.auth, require('./router/login'))
app.use(uniquePath.caf, require('./router/caf'))

server.listen( port, () => {
    console.log(`Servidor corriendo en puerto ${port}`)
})
