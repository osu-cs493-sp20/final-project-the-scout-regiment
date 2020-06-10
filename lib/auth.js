const { getUserById } = require("../models/user");
const { getCourseById, getCourseByEnrolledStudentId } = require("../models/course");
const { getAssignById } = require("../models/assign");

const jwt = require('jsonwebtoken');

const secretKey = 'SuperSecret123';

exports.generateAuthToken = (userId) => {
  const payload = { sub: userId };
  return jwt.sign(payload, secretKey, { expiresIn: '24h' });
}

exports.requireAuthentication = (req, res, next) => {
  const authHeader = req.get('Authorization') || '';
  const authHeaderParts = authHeader.split(' ');
  const token = authHeaderParts[0] === 'Bearer' ?
                authHeaderParts[1] : null;

  try {
    const payload = jwt.verify(token, secretKey);
    req.user = payload.sub;
    next();
  } catch (err) {
    console.error("  -- error:", err);
    res.status(401).send({
      error: "Invalid authentication token"
    });
  }
}

function roleValue(roll) {
  switch(roll) {
    case "admin":
      return 3;
    case "instructor":
      return 2;
    case "student":
      return 1;
    default:
      return 0;
  }
} 

exports.authRole = (creatorRole, newUserRole) => {
  return !(roleValue(newUserRole) > 1 && roleValue(creatorRole) !== 3);
}

exports.validateAdmin = async function (userId, res) {
  try {
    const user = await getUserById(userId);
    if (user && user.role !== 'admin') {
      res.status(403).send({
        error: "Unauthorized to access the specified resource"
      });
      return 0;
    }
  } catch (err) {
    console.error(err);
    res.status(400).send({
      error: "Unable to locate authorized user. Please try again later."
    });
    return 0;
  }
  return 1;
}

exports.validateStudent = async function (userId, assignmentId, res) {
  try {
    const user = await getUserById(userId);
    if (user && user.role === 'student') {
      const assignment = await getAssignById(assignmentId);
      if (!assignment) {
        throw "Unable to locate assignment";
      }
      const course = await getCourseByEnrolledStudentId(assignment.courseId, userId);
      if (!course) {
        res.status(403).send({
          error: "Unauthorized to access the specified resource"
        });
        return 0;
      }
    } else {
      throw "Unauthorized user";
    }
  } catch (err) {
    console.error(err);
    res.status(400).send({
      error: "Unable to authorize user."
    });
    return 0;
  }
  return 1;
}

exports.validateRole = async function (userId, courseId, res) {
  try {
    const course = await getCourseById(courseId, false, false);
    const user = await getUserById(userId);
    if (user && user.role !== 'admin') {
      if (course && userId !== course.instructorId) {
        res.status(403).send({
          error: "Unauthorized to access the specified resource"
        });
        return 0;
      }
    }
  } catch (err) {
    console.error(err);
    res.status(500).send({
      error: "Unable to locate course. Please try again later."
    });
    return 0;
  }
  return 1;
}
