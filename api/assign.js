const router = require('express').Router();
const multer = require("multer");
const crypto = require('crypto');

const { validateAgainstSchema } = require('../lib/validation');
const { requireAuthentication } = require('../lib/auth');
const { validateRole, validateStudent, validateSubmission } = require("../lib/auth");

const { AssignmentSchema,
    SubmissionSchema,
    insertNewAssign,
    getAssignById,
    updateAssignById,
    removeAssignById,
    insertNewSubmissionById,
    removeUploadedSubmission,
    getSubmissionPage,
    getSubmissionDownloadStreamById } = require('../models/assign');

const fileTypes = {
    "application/pdf": "pdf",
    "text/plain": "txt",
    "application/vnd.openxmlformats-officedocument.wordprocessingml.document": "docx"
}

const upload = multer({
    storage: multer.diskStorage({
        destination: `${__dirname}/uploads`,
        filename: (req, file, callback) => {
            const filename = crypto.pseudoRandomBytes(16).toString('hex');
            const extension = fileTypes[file.mimetype];
            callback(null, `${filename}.${extension}`);
        }
    }),
    fileFilter: (req, file, callback) => {
        callback(null, !!fileTypes[file.mimetype]);
    }
});

router.post('/', requireAuthentication, async (req, res) => {
    if(validateAgainstSchema(req.body, AssignmentSchema)) {
        if (!(await validateRole(req.user, req.body.courseId, res))) {
            return;
        }
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
    if (!(await validateRole(req.user, req.body.courseId, res))) {
        return;
    }

    try {
        const id = req.params.id;
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

router.patch('/:id', requireAuthentication, async (req, res, next) => {
    if (!(await validateRole(req.user, req.body.courseId, res))) {
        return;
    }

    if (validateAgainstSchema(req.body, AssignmentSchema)){
        try {
            const id = req.params.id;
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

router.delete('/:id', requireAuthentication, async (req, res, next) => {
    if (!(await validateRole(req.user, req.body.courseId, res))) {
        return;
    }

    try {
        const deleteSuccessful = await removeAssignById(req.params.id);
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

router.get('/:id/submissions', requireAuthentication, async (req, res, next) => {
    if (!(await validateSubmission(req.user, req.params.id, res))) {
        return;
    }
    try {
        const submission = await getSubmissionPage(req.query.page, req.params.id, req.query.studentId);
        if (submission) {
            res.status(200).send(submission);
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

router.post('/:id/submissions', requireAuthentication, upload.single('file'), async (req, res, next) => {
    if (!(await validateStudent(req.user, req.params.id, res))) {
        return;
    }

    if (validateAgainstSchema(req.body, SubmissionSchema)) {
        const file = {
            contentType: req.file.mimetype,
            filename: req.file.filename,
            path: req.file.path,
            assignmentId: req.body.assignmentId,
            studentId: req.body.studentId,
            timestamp: req.body.timestamp
        }
        try {
            const id = await insertNewSubmissionById(file);
            await removeUploadedSubmission(req.file);
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
});

router.get('/:id/media/submission/:sid', requireAuthentication, async (req, res, next) => {
    if (!(await validateSubmission(req.user, req.params.id, res))) {
        return;
    }
    getSubmissionDownloadStreamById(req.params.sid)
        .on('file', (file) => {
            res.status(200).type(file.metadata.contentType);
        })
        .on('error', (err) => {
            if (err.code === 'ENOENT') {
                next();
            } else {
                next(err);
            }
        })
        .pipe(res);
})

module.exports = router;
