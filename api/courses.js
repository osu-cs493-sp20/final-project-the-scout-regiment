const router = require('express').Router();

const { validateAgainstSchema } = require('../lib/validation');
const { requireAuthentication } = require("../lib/auth");
const { getUserById } = require('../models/user');


const {
    CourseSchema,
    getCoursesPage,
    insertNewCourse,
    getCourseById,
    getCourseRosterById,
    updateCourseById,
    updateCourseStudentsById,
    removeCourseById
} = require('../models/course');

async function validateAdmin(userId, res) {
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

async function validateRole(userId, courseId, res) {
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

router.get('/', async (req, res) => {
    try {
        const coursePage = await getCoursesPage(req.query);
        if (coursePage.page < coursePage.totalPages) {
            coursePage.links.nextPage = `/courses?page=${coursePage.page + 1}`;
            coursePage.links.lastPage = `/courses?page=${coursePage.totalPages}`;
        }
        if (coursePage.page > 1) {
            coursePage.links.prevPage = `/courses?page=${coursePage.page - 1}`;
            coursePage.links.firstPage = '/courses?page=1';
        }
        res.status(200).send(coursePage);
    } catch (err) {
        console.error(err);
        res.status(500).send({
            error: "Error fetching courses list.  Please try again later."
        });
    }
});

router.post('/', requireAuthentication, async (req, res) => {
    if (!(await validateAdmin(req.user, res))) {
        return;
    }

   if (validateAgainstSchema(req.body, CourseSchema)) {
       try {
           const id = await insertNewCourse(req.body);
           res.status(201).send({
               id: id,
               links: {
                   course: `/courses/${id}`
               }
           });
       } catch (err) {
           console.error(err);
           res.status(500).send({
               error: "Error inserting course into DB.  Please try again later."
           });
       }
   } else {
       res.status(400).send({
           error: "Request body is not a valid business object."
       });
   }
});

router.get('/:id', async (req, res, next) => {
    try {
        const course = await getCourseById(req.params.id, false, false);
        if (course) {
            res.status(200).send({
                course: course
            });
        } else {
            next();
        }
    } catch (err) {
        console.error(err);
        res.status(500).send({
            error: "Unable to locate course.  Please try again later."
        });
    }
});

router.get('/:id/roster', requireAuthentication, async (req, res, next) => {
    if (!(await validateRole(req.user, req.params.id, res))) {
        return;
    }
    try {
        const csv = await getCourseRosterById(req.params.id);
        if (csv) {
            res.status(200)
                .set('Content-Type', 'text/csv')
                .send(csv);
        } else {
            res.status(400).send({
                error: "Unable to locate any students for the course."
            });
        }
    } catch (err) {
        console.error(err);
        res.status(500).send({
            error: "Unable to locate course.  Please try again later."
        });
    }
});

router.get('/:id/assignments', async (req, res, next) => {
    try {
        const course = await getCourseById(req.params.id, false, true);
        if (course) {
            res.status(200).send({
                assignments: course.assignments
            });
        } else {
            next();
        }
    } catch (err) {
        console.error(err);
        res.status(500).send({
            error: "Unable to locate course.  Please try again later."
        });
    }
});

router.get('/:id/students', requireAuthentication, async (req, res, next) => {
    if (!(await validateRole(req.user, req.params.id, res))) {
        return;
    }

    try {
        const course = await getCourseById(req.params.id, true, false);
        if (course) {
            res.status(200).send({
                students: course.students
            });
        } else {
            next();
        }
    } catch (err) {
        console.error(err);
        res.status(500).send({
            error: "Unable to locate course.  Please try again later."
        });
    }
});

router.post('/:id/students', requireAuthentication, async (req, res, next) => {
    if (!(await validateRole(req.user, req.params.id, res))) {
        return;
    }

    if (req.body && (req.body.add || req.body.remove)) {
        try {
            const updateSuccessful = await updateCourseStudentsById(req.params.id, req.body);
            if (updateSuccessful) {
                res.status(200).send({
                    links: {
                        course: `/courses/${req.params.id}`
                    }
                });
            } else {
                next();
            }
        } catch (err) {
            console.error(err);
            res.status(500).send({
                error: "Unable to locate course.  Please try again later."
            });
        }
    } else {
        res.status(400).send({
            error: "Request body is not a valid course student object"
        });
    }
});

router.patch('/:id', requireAuthentication, async (req, res, next) => {
    if (!(await validateRole(req.user, req.params.id, res))) {
        return;
    }

        try {
            const updateSuccessful = await updateCourseById(req.params.id, req.body);
            if (updateSuccessful) {
                res.status(200).send({
                    links: {
                        course: `/courses/${req.params.id}`
                    }
                });
            } else {
                next();
            }
        } catch (err) {
            console.error(err);
            res.status(500).send({
                error: "Unable to locate course.  Please try again later."
            });
        }
});

router.delete('/:id', requireAuthentication, async (req, res, next) => {
    if (!(await validateAdmin(req.user, res))) {
        return;
    }
    try {
        const deleteSuccessful = await removeCourseById(req.params.id);
        if (deleteSuccessful) {
            res.status(204).end();
        } else {
            next();
        }
    } catch (err) {
        console.error(err);
        res.status(500).send({
            error: "Unable to delete course.  Please try again later."
        });
    }
});

module.exports = router;
