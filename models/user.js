const bcrypt = require('bcrypt');

const { ObjectId } = require('mongodb');
const { extractValidFields } = require('../lib/validation');
const { getDBReference } = require('../lib/mongo');


const UserSchema = {
  name: { required: true },
  email: { required: true },
  password: { required: true },
  role: { required: true}
};
exports.UserSchema = UserSchema;


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

exports.getUserById = async (id) => {
  const db = getDBReference();
  const collection = db.collection('users');
  if (!ObjectId.isValid(id)) {
    return null;
  } else {
    const results = await collection
      .find({ _id: new ObjectId(id) })
      .project({ password: 0 })
      .toArray();

    const user = results[0];
    let courses = [];

    if (user.role === 'instructor') {
      courses = await collection
        .find({ instructorId: user._id })
        .toArray();
    } else {
      
    }

    return {
      ...user,
      courses: courses
    };
  }
};

exports.validateUser = async (email, password) => {
  const db = this.getDBReference();
  const collection = db.collection('users');
  const user = (await collection
    .find({ email: email })
    .toArray()
    )[0];
    
  if (user && await bcrypt.compare(password, user.password)) {
    return user;
  } else {
    return false;
  }
}
