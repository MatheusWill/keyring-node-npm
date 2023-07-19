const { assert } = require("chai");
const fs = require("fs");
const data = JSON.parse(fs.readFileSync(`${__dirname}/data.json`));

const { keyring } = require("../keyring");

const scenarios = {
  update(encryption, scenario) {
    test("should updates attribute", () => {
      const keys = {};
      keys[scenario.key.id] = scenario.key.value;
      const keyChain = keyring(keys, { encryption, digestSalt: "" });

      let [encrypted, keyringId, digest] = keyChain.encrypt(scenario.input);

      assert.equal(keyringId, scenario.encrypted.keyring_id);
      assert.equal(digest, scenario.encrypted.digest);
      assert.equal(keyChain.decrypt(encrypted, keyringId), scenario.input);

      [encrypted, keyringId, digest] = keyChain.encrypt(scenario.update.input);

      assert.equal(keyringId, scenario.update.encrypted.keyring_id);
      assert.equal(digest, scenario.update.encrypted.digest);
      assert.equal(
        keyChain.decrypt(encrypted, keyringId),
        scenario.update.input
      );
    });
  },

  encrypt(encryption, scenario) {
    test("should encrypts value", () => {
      const keys = {};
      keys[scenario.key.id] = scenario.key.value;
      const keyChain = keyring(keys, { encryption, digestSalt: "" });

      const [encrypted, keyringId, digest] = keyChain.encrypt(scenario.input);

      assert.equal(keyringId, scenario.encrypted.keyring_id);
      assert.equal(digest, scenario.encrypted.digest);

      const decrypted = keyChain.decrypt(encrypted, keyringId);

      assert.equal(decrypted, scenario.input);
    });

    test("should decrypts value", () => {
      const keys = {};
      keys[scenario.key.id] = scenario.key.value;
      const keyChain = keyring(keys, { encryption, digestSalt: "" });
      const decrypted = keyChain.decrypt(
        scenario.encrypted.value,
        scenario.encrypted.keyring_id
      );

      assert.equal(decrypted, scenario.input);
    });
  },

  rotate(encryption, scenario) {
    test("should rotates key", () => {
      const keys = {};
      keys[scenario.key.id] = scenario.key.value;
      let keyChain = keyring(keys, { encryption, digestSalt: "" });
      let [encrypted, keyringId, digest] = keyChain.encrypt(scenario.input);

      assert.equal(keyringId, scenario.encrypted.keyring_id);
      assert.equal(digest, scenario.encrypted.digest);
      assert.equal(keyChain.decrypt(encrypted, keyringId), scenario.input);

      keys[scenario.rotate.key.id] = scenario.rotate.key.value;
      keyChain = keyring(keys, { encryption, digestSalt: "" });
      [encrypted, keyringId, digest] = keyChain.encrypt(scenario.input);

      assert.equal(keyringId, scenario.rotate.encrypted.keyring_id);
      assert.equal(digest, scenario.rotate.encrypted.digest);
      assert.equal(keyChain.decrypt(encrypted, keyringId), scenario.input);
    });
  },
};

Object.keys(data).forEach((encryption) => {
  suite(`tests should for ${encryption}`, () => {
    data[encryption].forEach((scenario) => {
      scenarios[scenario.action](encryption, scenario);
    });
  });
});
