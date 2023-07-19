const { assert } = require("chai");
const { keyring } = require("../keyring");

suite("keyring", () => {
  test("should raises exception for missing digest salt", () => {
    assert.throw(() => {
      keyring({ 0: "uDiMcWVNTuz//naQ88sOcN+E40CyBRGzGTT7OkoBS6M=" });
    }, /Please provide `salt` option/);
  });
});

test("should raises exception when trying to use empty keyring", () => {
  assert.throws(() => {
    keyring({}, { salt: "" }).encrypt("42");
  }, "You must initialize the keyring");
});

test("should raises exception when using non-integer keys", () => {
  assert.throws(() => {
    keyring(
      { a: "uDiMcWVNTuz//naQ88sOcN+E40CyBRGzGTT7OkoBS6M=" },
      { salt: "" }
    ).encrypt("42");
  }, "All keyring keys must be integer numbers");
});

test("should returns digest using salt", () => {
  const keys = { 0: "uDiMcWVNTuz//naQ88sOcN+E40CyBRGzGTT7OkoBS6M=" };
  const options = { salt: "a" };
  const [encrypted, keyringId, digest] = keyring(keys, options).encrypt("42");

  assert.equal(digest, "118c884d37dde5fb6816daba052d94e82f1dc41f");
});

test("should encrypts property using aes-128-cbc", () => {
  const keys = { 0: "uDiMcWVNTuz//naQ88sOcN+E40CyBRGzGTT7OkoBS6M=" };
  const options = { salt: "" };
  const [encrypted, keyringId] = keyring(keys, options).encrypt("42");
  const decrypted = keyring(keys, options).decrypt(encrypted, keyringId);

  assert.notEqual(encrypted, undefined);
  assert.notEqual(encrypted, "42");
  assert.equal(decrypted, "42");
});

test("should encrypts property using aes-192-cbc", () => {
  const keys = {
    0: "wtnnoK+5an+FPtxnkdUDrNw6fAq8yMkvCvzWpriLL9TQTR2WC/k+XPahYFPvCemG",
  };
  const options = { encryption: "aes-192-cbc", salt: "" };
  const [encrypted, keyringId] = keyring(keys, options).encrypt("42");
  const decrypted = keyring(keys, options).decrypt(encrypted, keyringId);

  assert.notEqual(encrypted, undefined);
  assert.notEqual(encrypted, "42");
  assert.equal(decrypted, "42");
});

test("should encrypts property using aes-256-cbc", () => {
  const keys = {
    0: "XZXC+c7VUVGpyAceSUCOBbrp2fjJeeHwoaMQefgSCfp0/HABY5yJ7zRiLZbDlDZ7HytCRsvP4CxXt5hUqtx9Uw==",
  };
  const options = { encryption: "aes-256-cbc", salt: "" };
  const [encrypted, keyringId] = keyring(keys, options).encrypt("42");
  const decrypted = keyring(keys, options).decrypt(encrypted, keyringId);

  assert.notEqual(encrypted, undefined);
  assert.notEqual(encrypted, "42");
  assert.equal(decrypted, "42");
});

test("should sets keyring id", () => {
  let encrypted, keyringId;
  const key = "uDiMcWVNTuz//naQ88sOcN+E40CyBRGzGTT7OkoBS6M=";
  const options = { salt: "" };

  [encrypted, keyringId] = keyring({ 0: key }, options).encrypt("42");
  assert.equal(keyringId, 0);

  [encrypted, keyringId] = keyring({ 1: key }, options).encrypt("42");
  assert.equal(keyringId, 1);
});

test("should throws exception when trying to encrypt non-string", () => {
  const keys = { 0: "uDiMcWVNTuz//naQ88sOcN+E40CyBRGzGTT7OkoBS6M=" };

  assert.throws(() => {
    keyring(keys, { salt: "" }).encrypt(1234);
  });
});
