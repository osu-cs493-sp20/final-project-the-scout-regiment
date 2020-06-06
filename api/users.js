const router = require('express').Router();

const { validateAgainstSchema } = require('../lib/validation');
const { requireAuthentication, authRole, generateAuthToken } = require('../lib/auth');
const { getUserById, validateUser, insertNewUser } = require('../models/user');

router.post('/', requireAuthentication, async (req, res) => {
  if (validateAgainstSchema(req.body, UserSchema)) {
    const user = await getUserById(parseInt(req.user));
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


router.post('/login', async (req, res) => {
  if (req.body && req.body.email && req.body.password) {
    try {
      const authenticated = await validateUser(
        req.body.email,
        req.body.password
      );
      if (authenticated) {
        const token = generateAuthToken(authenticated.id);
        res.status(200).send({
          token: token
        });
      } else {
        res.status(401).send({
          error: "The specified credentials were invalid."
        });
      }
    } catch (err) {
      res.status(500).send({
        error: "An internal server error occurred."
      });
    }
  } else {
    res.status(400).send({
      error: "The request body was either not present or did not contain all of the required fields."
    });
  }
});

router.get('/:id', requireAuthentication, async (req, res, next) => {
  if (req.user == req.params.id) {
    try {
      const user = await getUserById(req.params.id);
      if (user) {
        res.status(200).send(user);
      } else {
        res.status(404).send("Specific Course `id` not found.");
      }
    } catch (err) {
      res.status(500).send({
        error: "An internal server error occurred."
      });
    }
  } else  {
    res.status(403).send({
      error: "The request was not made by an authenticated User satisfying the authorization criteria."
    });
  }
});

module.exports= router;
