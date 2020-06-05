const router = require('express').Router();

const { validateAgainstSchema } = require('../lib/validation');
const { requireAuthentication, authRole } = require('../lib/auth');

router.post('/', requireAuthentication, async (req, res) => {
  if (validateAgainstSchema(req.body, UserSchema)) {
    const user = await getUserDetailsById(parseInt(req.user));
    if (authRole(user.role, req.body.role)) {
      try {
        const id =  await insertNewUser(req.body);
        res.status(201).send({
          id: id
        });
      } catch (err) {
        res.status(500).send({
          error: "Error inserting new user. Try again later."
        });
      }
    } else {
      res.status(403).send({
        error: "The request was not made by an authenticated User satisfying the authorization criteria."
      });
    }
  } else {
    res.status(400).send({
      error: "The request body was either not present or did not contain a valid User object."
    });
  }
});