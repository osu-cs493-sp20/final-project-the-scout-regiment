const router = require('express').Router();

const { validateAgainstSchema } = require('../lib/validation');

const {
    CourseSchema,
    getCoursesPage,
    insertNewCourse
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

module.exports = router;
