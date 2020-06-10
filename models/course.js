/*
 * Course schema and data accessor methods;
 */

const { ObjectId } = require('mongodb');

const { getDBReference } = require('../lib/mongo');
const { extractValidFields } = require('../lib/validation');

const { getUserById } = require("./user");

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
exports.getCoursesPage = async function (query) {
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
        .project({students: 0, assignments: 0})
        .toArray();

    return {
        courses: results,
        page: page,
        totalPages: lastPage,
        pageSize: pageSize,
        count: count
    };
}

exports.insertNewCourse = async function (course) {
    course = extractValidFields(course, CourseSchema);
    course.students = [];
    course.assignments = [];
    const db = getDBReference();
    const collection = db.collection('courses');
    const result = await collection.insertOne(course);
    return result.insertedId;
}

exports.getCourseById = async function (id, includeStudents, includeAssignments) {
    const db = getDBReference();
    const collection = db.collection('courses');
    if (!ObjectId.isValid(id)) {
        return null;
    } else {
        let projection = {};
        if (!includeStudents) { projection.students = 0; }
        if (!includeAssignments) { projection.assignments = 0; }
        const results = await collection
            .find({ _id: new ObjectId(id) })
            .project(projection)
            .toArray();
        return results[0];
    }
}

exports.getCourseByEnrolledStudentId = async function (courseId, studentId) {
    const db = getDBReference();
    const collection = db.collection('courses');
    if (!ObjectId.isValid(courseId)) {
        return null;
    } else {
        const results = await collection
            .find({
                _id: new ObjectId(courseId),
                students: new ObjectId(studentId)
            })
            .toArray();
        return results[0];
    }
}


exports.getCourseRosterById = async function (id) {
    let csv = "";
    const course = await exports.getCourseById(id, true, false);
    if (course) {
        for (let i = 0; i < course.students.length; i++) {
            course.students[i] = await getUserById(course.students[i]);
            delete course.students[i].role;
            delete course.students[i].enrolled_courses;
        }
        const students = course.students;
        if (students.length > 0) {
            const header = Object.keys(students[0]);
            const replacer = (key, value) => value === null ? '' : value

            csv = students.map(row => header.map(fieldName => JSON.stringify(row[fieldName], replacer)));
            csv.unshift(header.join(','));
            csv = csv.join('\r\n');
        }
    }
    return csv;
}

exports.updateCourseById = async function (id, course) {
    const db = getDBReference();
    const collection = db.collection('courses');

    if (!ObjectId.isValid(id)) {
        return null;
    } else {
        course = extractValidFields(course, CourseSchema);
        const results = await collection.updateOne(
            { _id: new ObjectId(id) },
            { $set: course }
        );
        return results.matchedCount > 0;
    }
}

exports.updateCourseStudentsById = async function (id, students) {
    const db = getDBReference();
    const collection = db.collection('courses');

    let matchedCount = 0;
    if (!ObjectId.isValid(id)) {
        return null;
    } else {
        if (students.add) {
            students.add = students.add.map(x => new ObjectId(x));
            const results = await collection.updateOne(
                { _id: new ObjectId(id) },
                { $addToSet: {
                        students: {
                            $each: students.add
                        }
                    }
                }
            );
            matchedCount += results.matchedCount;
        }
        if (students.remove) {
            students.remove = students.remove.map(x => new ObjectId(x));
            const results = await collection.updateOne(
                { _id: new ObjectId(id) },
                { $pull: {
                        students: {
                            $in: students.remove
                        }
                    }
                },
                {multi: true}
            );
            matchedCount += results.matchedCount;
        }

        return matchedCount > 0;
    }
}

exports.removeCourseById = async function (id) {
    const db = getDBReference();
    const collection = db.collection('courses');

    if (!ObjectId.isValid(id)) {
        return null;
    } else {
        const results = await collection.deleteOne(
            { _id: new ObjectId(id) }
        );
        return results.deletedCount > 0;
    }
}
