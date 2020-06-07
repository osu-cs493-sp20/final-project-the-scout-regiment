const router = require('express').Router();

const { validateAgainstSchema } = require('../lib/validation');

const {
    CourseSchema,
    getCoursesPage,
    insertNewCourse,
    getCourseDetailsById,
    updateCourseById,
    removeCourseById
} = require('../models/course');

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

router.post('/', async (req, res) => {
   // if (!req.admin) {
   //     res.status(403).send({
   //         error: "Unauthorized to access the specified resource"
   //     });
   //     return;
   // }

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

router.get('/courses/:id/', async (req, res, next) => {
    // try {
    //     const course = await getCourseById(parseInt(req.params.id));
    //     if (!req.admin) {
    //         if (course && req.user !== course.instructorId) {
    //             res.status(403).send({
    //                 error: "Unauthorized to access the specified resource"
    //             });
    //             return;
    //         }
    //     }
    // } catch (err) {
    //     console.error(err);
    //     res.status(500).send({
    //         error: "Unable to locate course. Please try again later."
    //     });
    //     return;
    // }
    try {
        const id = parseInt(req.params.id);
        const existingCourse = await getCourseDetailsById(id);
        if (existingCourse) {
            if (req.body.instructorId === existingCourse.instructorId) {
                const roster = await getCourseDetailsById(id);
                if (roster) {
                    res.status(200)
                        .set('Content-Type', 'text/csv')
                        .send(roster);
                } else {
                    next();
                }
            } else {
                res.status(403).send({
                    error: "Course must have the same instructorId"
                });
            }
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

router.put('/:id', async (req, res, next) => {
    // try {
    //     const course = await getCourseById(parseInt(req.params.id));
    //     if (!req.admin) {
    //         if (course && req.user !== course.instructorId) {
    //             res.status(403).send({
    //                 error: "Unauthorized to access the specified resource"
    //             });
    //             return;
    //         }
    //     }
    // } catch (err) {
    //     console.error(err);
    //     res.status(500).send({
    //         error: "Unable to locate course. Please try again later."
    //     });
    //     return;
    // }
    if (validateAgainstSchema(req.body, CourseSchema)){
        try {
            const id = parseInt(req.params.id);
            const existingCourse = await getCourseDetailsById(id);
            if (existingCourse) {
                if (req.body.instructorId === existingCourse.instructorId) {
                    const updateSuccessful = await updateCourseById(id, req.body);
                    if (updateSuccessful) {
                        res.status(200).send({
                            links: {
                                course: `/courses/${id}`
                            }
                        });
                    } else {
                        next();
                    }
                } else {
                    res.status(403).send({
                        error: "Updated course must have the same instructorId"
                    });
                }
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
            error: "Request body is not a valid course object."
        });
    }
});

router.delete('/:id', async (req, res, next) => {
    if (!req.admin) {
        res.status(403).send({
            error: "Unauthorized to access the specified resource"
        });
        return;
    }
    try {
        const deleteSuccessful = await removeCourseById(parseInt(req.params.id));
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
