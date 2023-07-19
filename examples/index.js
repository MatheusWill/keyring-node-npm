const { keyring } = require("../index");

const keys = { 1: "batataAssadaCom3Sal" };
const encrypt = keyring(keys, { salt: "salt-n-pepper" });

// STEP 1: Encrypt message using latest encryption key.
const [encrypted, keyringId, digest] = encrypt.encrypt("TESTE SECRETO");

console.log(`🔒 ${encrypted}`);
console.log(`🔑 ${keyringId}`);
console.log(`🔎 ${digest}`);
//=> 🔒 Vco48O95YC4jqj44MheY8zFO2NLMPp/KILiUGbKxHvAwLd2/AN+zUG650CJzogttqnF1cGMFb//Idg4+bXoRMQ==
//=> 🔑 1
//=> 🔎 c39ec9729dbacd45cecd5ea9a60b15b50b0cc857

// STEP 2: Decrypted message using encryption key defined by keyring id.
const decrypted = encrypt.decrypt(encrypted, keyringId);
console.log(`✉️ ${decrypted}`);
//=> ✉️ TESTE SECRETO
