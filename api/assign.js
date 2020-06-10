const router = require('express').Router();

const { validateAgainstSchema } = require('../lib/validation');
const { requireAuthentication } = require('../lib/auth');
const { AssignmentSchema, SubmissionSchema, insertNewAssign, getAssignById, updateAssignById, removeAssignById, insertNewSubmissionById } = require('../models/assign');

router.post('/', requireAuthentication, async (req, res) => {
    if(validateAgainstSchema(req.body, AssignmentSchema)) {
        //TODO: Validate the user is authorized
        try {
            const id = await insertNewAssign(req.body);
            res.status(201).send({
                id: id
            });
        } catch (err) {
            res.status(500).send({
                message: "Error inserting new assignment. Try again later.",
                error: err
            });
        }
    } else {
        res.status(403).send({
            error: "The request body was either not present or did not contain a valid Assignment object."
        });
    }
});

router.get('/:id', requireAuthentication, async (req, res, next) => {
    try {
        const id = parseInt(req.params.id);
        const assign = await getAssignById(id);
        if (assign) {
            res.status(200).send({
                assign: assign
            });
        } else {
            res.status(404).send("Specified Assignment `id` not found.")
        }
    } catch (err) {
        console.error(err);
        res.status(500).send({
            message: "An internal server error occurred.",
            error: err
        });
    }
})

router.patch('/:id', async (req, res, next) => {
    if (validateAgainstSchema(req.body, AssignmentSchema)){
        try {
            const id = parseInt(req.params.id);
            const existingAssign = await getAssignById(id);
            if(existingAssign) {
                const updateSuccessful = await updateAssignById(id, req.body);
                if (updateSuccessful) {
                    res.status(200).send("Success");
                } else {
                    res.status(400).send({
                        error: "The request body was either not present or did not contain any fields related to Assignment objects."
                    });
                }
            } else {
                res.status(404).send({
                    error: "Specified Assignment `id` not found."
                });
            }
        } catch (err) {
            res.status(500).send({
                msg: "An internal server error occurred.",
                error: err
            });
        }
    }
})

router.delete('/:id', async (req, res, next) => {
    try {
        const deleteSuccessful = await removeAssignById(parseInt(req.params.id));
        if (deleteSuccessful) {
            res.status(204).send("Success");
        } else {
            res.status(404).send({
                error: "Specified Assignment `id` not found."
            });
        }
    } catch (err) {
        res.status(500).send({
            msg: "An internal server error occurred.",
            error: err
        })
    }
});

router.get('/:id/submissions', async (req, res, next) => {
    try {
        const id = parseInt(req.params.id);
        const assign = await getAssignById(id);
        if (assign) {
            res.status(200).send({
                submissions: assign.submissions
            });
        } else {
            res.status(404).send({
                error: "Specified Assignment `id` not found."
            });
        }
    } catch (err) {
        res.status(500).send({
            msg: "An internal server error occurred.",
            error: err
        })
    }
})

router.post('/:id/submissions', async (req, res, next) => {
    if (validateAgainstSchema(req.body, SubmissionSchema)) {
        try {
            const id = await insertNewSubmissionById(req.body);
            res.status(201).send({
                id: id
            });
        } catch (err) {
            res.status(500).send({
                message: "Error inserting new submission. Try again later.",
                error: err
              });
        }
    } else {
        res.status(400).send({
            error: "The request body was either not present or did not contain a valid Submission object."
        })
    }
})

module.exports = router;
