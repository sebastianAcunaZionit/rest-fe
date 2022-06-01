const ftp = require('basic-ftp');
const fs = require('fs');


class FTPClient {
    constructor(host = 'localhost', port = 21, username = 'anonymous', password = 'guest', secure = false) {
        this.client = new ftp.Client();
        this.settings = {
            host: host,
            port: port,
            user: username,
            password: password,
            secure: secure
        };
    }

    async upload(sourcePath, remotePath, permissions) {
        let self = this;

        try {
            let access = await self.client.access(self.settings);
            let upload = await self.client.uploadFrom(fs.createReadStream(sourcePath), remotePath);
            let setPermissions = await self.changePermissions(permissions.toString(), remotePath);

            self.client.close();
            return {
                ok:true,
                message:`se movio archivo a ftp`
            }
        } catch(err) {
            self.client.close();
            return {
                ok:false,
                message:`No se pudo mover archivo a ftp`
            }
        }
    }

    close() {
        this.client.close();
    }

    changePermissions(perms, filepath) {
        let cmd = 'SITE CHMOD ' + perms + ' ' + filepath;
        return this.client.send(cmd, false);
    }
}

module.exports = FTPClient;