const { keyring } = require("../keyring");

const keys = { 1: "uDiMcWVNTuz//naQ88sOcN+E40CyBRGzGTT7OkoBS6M=" };
const encrypt = keyring(keys, { salt: "salt-n-pepper" });

// STEP 1: Encrypt message using latest encryption key.
const [encrypted, keyringId, digest] = encrypt.encrypt("TESTE SECRETO");

console.log(`🔒 ${encrypted}`);
console.log(`🔑 ${keyringId}`);
console.log(`🔎 ${digest}`);
//🔒 => VIJD6RYVVBdt13YOnCMomDkKSxnIq3nv6NuNVuXA7+ezioZuZbGyK1qOz7wsYOU9rCstGvLNbXenia99nUomdA==
//=> 🔑 => 1
//=> 🔎 => d8bf9acf6c7558d61b7a1cc1f303e6c15dc4bc81

// STEP 2: Decrypted message using encryption key defined by keyring id.
const decrypted = encrypt.decrypt(encrypted, keyringId);
console.log(`✉️ ${decrypted}`);
//✉️  =>  TESTE SECRETO
