/**
 * Node crypto module.
 * @constant
 * @type {Object}
 */
const crypto = require("crypto");

/**
 * Set the default keyring options.
 * @constant
 * @type {Object}
 */
const defaultKeyringOptions = {
  encryption: "aes-128-cbc",
};

// It's the double of the actual size because * half of the key is used as the HMAC key.
/**
 * Expected key size.
 *
 * @constant
 * @type {Object}
 */
const keySizes = {
  "aes-128-cbc": 16,
  "aes-192-cbc": 24,
  "aes-256-cbc": 32,
};

/**
 * @internal
 * @private
 */
const missingSaltError =
  "Kindly include the salt option; to avoid this error, you can explicitly pass an empty string..";

/**
 * Create a new keyring.
 * A keyring constitutes a collection of keys and associated functions designed for encryption and decryption purposes.
 *
 * @public
 * @param  {array}   keys                The encryption keys as described.
 * @param  {Object}  options             The keyring options.
 * @param  {String}  options.encryption  The encryption algorithm.
 *                                       Can be `aes-128-cbc`, `aes-192-cbc` or `aes-256-cbc`.
 * @param  {String}  options.salt        Any arbitrary string that will be appended to the message during the SHA1 generation.
 * @return {String}                      An object containing functions for encryption/decryption.
 */

const keyring = (keys, options = {}) => {
  options = Object.assign({}, defaultKeyringOptions, options);

  if (options.salt === undefined) throw new Error(missingSaltError);

  const keySize = keySizes[options.encryption];

  if (!keySize)
    throw new Error(
      `Encryption algorithm not recognized or unsupported: ${options.encryption}`
    );

  keys = normalizeKeys(keys, keySize);
  validateKeyring(keys);

  return {
    encrypt: (message) => encrypt(keys, options, message),
    decrypt: (message, keyringId) =>
      decrypt(findKey(keys, keyringId), options, message),
    digest: (message) => sha1(message, options),
    currentId: () => currentKey(keys).id,
  };
};

/**
 * Encrypt all properties from the specified object.
 *
 * @private This function is used by keyring().
 *
 * @param  {Array}  keys     The array of encryption keys.
 * @param  {Object} options  The keyring options as described by keyring().
 * @param  {String} message  The string that will be encrypted.
 * @return {Array}           A three-item array representing the encrypted value, the digest, and the keyring ID, respectively.
 */

const encrypt = (keys, { encryption, salt } = {}, message) => {
  const key = currentKey(keys);
  const iv = crypto.randomBytes(16);
  const cipher = crypto.createCipheriv(encryption, key.encryptionKey, iv);

  const encrypted = Buffer.concat([
    cipher.update(Buffer.from(message)),
    cipher.final(),
  ]);

  const hmac = hmacDigest(key.signingKey, Buffer.concat([iv, encrypted]));
  const returnValue = Buffer.concat([hmac, iv, encrypted]).toString("base64");
  const digest = sha1(message, { salt });

  return [returnValue, key.id, digest];
};

/**
 * Decrypt all properties from the specified object.
 *
 * @private This function is used by keyring().
 *
 * @param  {Array}  keys     The array of encryption keys.
 * @param  {Object} options  The keyring options as described by keyring().
 * @param  {Object} source   The object that will have its properties decrypted.
 * @return {Object}          The object with decrypted properties.
 */

const decrypt = (key, { encryption }, message) => {
  const decoded = Buffer.from(message, "base64");
  const hmac = decoded.subarray(0, 32);
  const iv = decoded.subarray(32, 48);
  const encrypted = decoded.subarray(48);
  const decipher = crypto.createDecipheriv(encryption, key.encryptionKey, iv);

  const decrypted = Buffer.concat([
    decipher.update(encrypted),
    decipher.final(),
  ]);

  const expectedHmac = hmacDigest(
    key.signingKey,
    Buffer.concat([iv, encrypted])
  );

  if (!verifySignature(expectedHmac, hmac)) {
    throw new Error(
      `Expected HMAC to be ${expectedHmac.toString(
        "base64"
      )}; got ${hmac.toString("base64")} instead`
    );
  }

  return decrypted.toString();
};

/**
 * Generate digest suffix based on prop case.
 * Precedence is:
 *
 * - Whatever is provided by the user.
 * - Use `Digest` for property names that look like `camelCase`.
 * - Defaults to `_digest`.
 *
 * @param  {[type]} prop   [description]
 * @param  {[type]} suffix [description]
 * @return {[type]}        [description]
 */

const resolveDigestSuffix = (prop, suffix) => {
  if (suffix) return suffix;
  else if (prop.match(/[a-z0-9]+[A-Z]/)) return "Digest";

  return "_digest";
};

/**
 * Generate a hash value for the given string in a hex-encoded form.
 * @param  {String} value
 * @return {String}        Hex-encoded string representing the SHA1 digest for the given string.
 */

const sha1 = (value, { salt } = {}) => {
  if (salt === undefined) throw new Error(missingSaltError);

  if (!isString(value)) {
    throw new Error(
      `You can only generated SHA1 digests from strings (received "${typeof value}" instead).`
    );
  }

  const hash = crypto.createHash("sha1");
  hash.update(`${value}${salt}`);
  return hash.digest("hex");
};

/**
 * Validate whether encryption keys are valid or not.
 *
 * @private  This function is used by keyring().
 * @todo     Validate key size against chosen encryption algorithm.
 *
 * @param  {Array}  keys  The array of encryption keys.
 * @return {undefined}
 */

const validateKeyring = (keys) => {
  if (keys.length === 0) throw new Error("You must initialize the keyring");

  const invalidIds = keys.some((key) => isNaN(key.id));

  if (invalidIds) throw new Error("All keyring keys must be integer numbers");
};

/**
 * Convert the encryptions keys JSON object into a normalized
 * array of objects representing keys.
 *
 * @private This function is used by keyring().
 *
 * @param  {Object} keys  The raw encryption keys object.
 * @return {Array}        List of key objects.
 */

const normalizeKeys = (keys, keySize) => {
  const expectedKeySize = keySize * 2;

  return Object.keys(keys).reduce((buffer, id) => {
    const secret = keyBuffer(keys[id]);

    if (secret.length !== expectedKeySize)
      throw new Error(
        `Expected key to be ${expectedKeySize} bytes long; got ${secret.length} instead`
      );

    const signingKey = secret.subarray(0, keySize);
    const encryptionKey = secret.subarray(keySize);

    buffer.push({
      id: parseInt(id, 10),
      encryptionKey,
      signingKey,
    });

    return buffer;
  }, []);
};

/**
 * Return buffer for key. It assumes that all keys
 * are base64-encoded.
 *
 * @private This function is used by normalizeKeys().
 *
 * @param  {String} value  Base64-encoded string representing the key.
 * @return {Buffer}        Buffer representing the encryption key.
 */

const keyBuffer = (value) => {
  if (value instanceof Buffer) return value;

  return Buffer.from(value, "base64");
};

/**
 * Return the current key, the one that has the largest id.
 *
 * @private This function is used by encrypt() and decrypt().
 *
 * @param  {Array} keys  The array of encryption keys.
 * @return {Object}      Current encryption key from keyring.
 */

const currentKey = (keys) => {
  return keys.reduce((a, b) => {
    return a.id > b.id ? a : b;
  });
};

/**
 * Find a key by its id.
 * Throw an exception in case key is not available.
 *
 * @private This function is used by keyring().
 *
 * @param  {Array}  keys  The array of encryption keys.
 * @param  {Number} id    The keyring id. Must be an integer.
 * @return {Object}       The matching key object.
 */

const findKey = (keys, id) => {
  const key = keys.find((key) => parseInt(key.id) === parseInt(id, 10));

  if (key) return key;

  throw new Error(`key=${id} is not available on keyring`);
};

/**
 * Check if `object` is string.
 * @param  {Object}   The object that will be checked.
 * @return {Boolean}
 */

const isString = (object) => {
  return typeof object === "string" || object instanceof String;
};

/**
 * Create HMAC from given message.
 *
 * @private This function is used by encrypt().
 *
 * @param  {Buffer} key      The hashing key.
 * @param  {String} message  The target message.
 * @return {Buffer}          The authentication code in binary format.
 */

const hmacDigest = (key, message) => {
  const hmac = crypto.createHmac("sha256", key);
  hmac.update(message);
  const digest = hmac.digest();
  hmac.end();

  return digest;
};

/**
 * Verify HMAC signature.
 *
 * @private Used by decrypt().
 *
 * @param  {Buffer}   expected The expected buffer.
 * @param  {Buffer}   actual   The actual buffer.
 * @return {Boolean}           Returns `true` when signature matches.
 */

const verifySignature = (expected, actual) => {
  let acc = 0;

  if (expected.length !== actual.length) return false;

  for (let i = 0; i < expected.length; i++) {
    acc |= expected[i] ^ actual[i];
  }

  return acc === 0;
};

/**
 * The package's public interface.
 *
 * @type {Object}
 */

module.exports = {
  keyring,
  sha1,
  options: defaultKeyringOptions,
};
