/*
 * Course schema and data accessor methods;
 */

const { ObjectId } = require('mongodb');

const { getDBReference } = require('../lib/mongo');
const { extractValidFields } = require('../lib/validation');

/*
 * Schema describing required/optional fields of a business object.
 */
const CourseSchema = {
    subject: { required: true },
    number: { required: true },
    term: { required: true },
    instructorId: { required: true }
};
exports.CourseSchema = CourseSchema;


/*
 * Executes a DB query to return a single page of courses.  Returns a
 * Promise that resolves to an array containing the fetched page of course.
 */
async function getCoursesPage(query) {
    const db = getDBReference();
    const collection = db.collection('courses');
    const count = await collection.countDocuments();

    let page = parseInt(query.page) || 1;
    /*
     * Compute last page number and make sure page is within allowed bounds.
     * Compute offset into collection.
     */
    const pageSize = 10;
    const lastPage = Math.ceil(count / pageSize);
    page = page > lastPage ? lastPage : page;
    page = page < 1 ? 1 : page;
    const offset = (page - 1) * pageSize;

    const search = extractValidFields(query, CourseSchema);
    const results = await collection.find(search)
        .sort({ _id: 1 })
        .skip(offset)
        .limit(pageSize)
        .toArray();

    return {
        courses: results,
        page: page,
        totalPages: lastPage,
        pageSize: pageSize,
        count: count
    };
}
exports.getCoursesPage = getCoursesPage;

async function insertNewCourse(course) {
    course = extractValidFields(course, CourseSchema);
    const db = getDBReference();
    const collection = db.collection('courses');
    const result = await collection.insertOne(course);
    return result.insertedId;
}
exports.insertNewCourse = insertNewCourse;
