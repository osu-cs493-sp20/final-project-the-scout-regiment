const bcrypt = require('bcrypt');

const { extractValidFields } = require('../lib/validation');


const UserSchema = {
  name: { required: true },
  email: { required: true },
  password: { required: true },
  role: { required: true}
};
exports.UserSchema = this.UserSchema;


exports.insertNewUser = async function (user) {
  const userToInsert = extractValidFields(user, UserSchema);

  userToInsert.password = await bcrypt.hash(
    userToInsert.password,
    8
  );

  const db = getDBReference();
  const collection = db.collection('users');
  const result = await collection.insertOne(userToInsert);
  return result.insertedId
}