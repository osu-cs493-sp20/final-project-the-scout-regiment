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
  let collection = db.collection('users');
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
      collection = db.collection('courses');
      courses = await collection
        .find({ instructorId: user._id.toString() })
        .project({subject: 0, number: 0, term: 0, instructorId: 0, students: 0, assignments: 0})
        .toArray();

      return {
        ...user,
        courses: courses
      };
    } else if (user.role === 'student') {
      collection = db.collection('courses');
      courses = await collection
        .find({ students: new ObjectId(user._id) })
        .project({subject: 0, number: 0, term: 0, instructorId: 0, students: 0, assignments: 0})
        .toArray();
      return {
        ...user,
        enrolled_courses: courses
      };
    } else {
      return user;
    }
  }
};

exports.validateUser = async (email, password) => {
  const db = getDBReference();
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
