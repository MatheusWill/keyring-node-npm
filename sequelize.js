const Sequelize = require("sequelize");
const Keyring = require("./keyring").keyring;

const isString = (value) => {
  return typeof value === "string" || value instanceof String;
};

const getModelOptions = (record) => {
  return record._modelOptions || record.constructor.options;
};

const beforeSave = (record, options) => {
  const { keys, keyringIdColumn, encryption, columns, salt } =
    getModelOptions(record).keyring;

  const keyring = Keyring(keys, { encryption, salt });

  columns.forEach((column) => {
    const digestColumn = `${column}_digest`;
    const value = record[column];
    let encrypted = null;
    let digest = null;
    let keyringId = record[keyringIdColumn] || keyring.currentId();

    if (isString(value))
      [encrypted, keyringId, digest] = keyring.encrypt(value);

    record[`encrypted_${column}`] = encrypted;
    record[keyringIdColumn] = keyringId;

    const attributes =
      record.attributes || Object.keys(record.constructor.rawAttributes);

    if (attributes.includes(digestColumn)) record[digestColumn] = digest;
  });
};

const afterFind = (record) => {
  if (!record) return;
  else if (record instanceof Array) return record.map(afterFind);

  const { keys, keyringIdColumn, encryption, columns, salt } =
    getModelOptions(record).keyring;

  const keyring = Keyring(keys, { encryption, salt });
  const keyringId = record[keyringIdColumn];

  columns.forEach((column) => {
    const keyringId = record[keyringIdColumn];
    const encrypted = record[`encrypted_${column}`];
    const value = isString(encrypted)
      ? keyring.decrypt(encrypted, keyringId)
      : null;
    record[column] = value;
  });
};

const setup = (
  model,
  {
    keys,
    columns,
    salt,
    encryption = "aes-128-cbc",
    keyringIdColumn = "keyring_id",
  }
) => {
  model.options.keyring = {
    keys,
    columns,
    encryption,
    keyringIdColumn,
    salt,
  };
  model.beforeSave(beforeSave);
  model.afterFind(afterFind);
};

module.exports = setup;
