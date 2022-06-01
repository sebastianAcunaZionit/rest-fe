const crypto = require('crypto')


const secretKey = process.env.PRIVATE_ENCRYPT_KEY;
const algorithm = process.env.ENCRIPTION_ALGORITHM;
const buffer  = Buffer.alloc(16);
buffer.write('9d014c16ba7b0f2c9a8ef6cfe08f8817')


const encryptManagment = (password) => {

   const cipher = crypto.createCipheriv(algorithm, secretKey, buffer);

   const encrypted = Buffer.concat([cipher.update(password), cipher.final()]);


   return {  encrypted_password:encrypted.toString('hex')  }

}

const decryptManagment = (hashedPassword) => {

    const decipher = crypto.createCipheriv(algorithm, secretKey, buffer, 'hex');
    const decrypted = Buffer.concat([decipher.update(Buffer.from(hashedPassword, 'hex')), decipher.final()])

    return decrypted.toString();

}



module.exports = {
    encryptManagment,
    decryptManagment
}