const jwt = require('jsonwebtoken');

const secretKey = 'SuperSecret123';

exports.generateAuthToken = (userId) => {
  const payload = { sub: userId };
  return jwt.sign(payload, secretKey, { expiresIn: '24h' });
}

exports.requireAuthentication = (req, res, next) => {
  const authHeader = req.body['Authorization'] || '';
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
  return !(roleValue(newUserRole) > 1 && roleValue(creatorRole) != 3);
}