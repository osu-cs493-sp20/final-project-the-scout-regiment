const fs = require('fs');
const { ObjectId, GridFSBucket } = require('mongodb');
const { extractValidFields } = require('../lib/validation');
const { getDBReference } = require("../lib/mongo");

const AssignmentSchema = {
    courseId: { required: true },
    title: { required: true },
    points: { required: true },
    due: { required: true }
};
exports.AssignmentSchema = AssignmentSchema;

const SubmissionSchema = {
    assignmentId: { required: true },
    studentId: { required: true },
    timestamp: { required: true }
}
exports.SubmissionSchema = SubmissionSchema

function getSubmissionResponseBody(submission) {
    return {
        _id: submission._id,
        assignmentId: submission.metadata.assignmentId,
        studentId: submission.metadata.studentId,
        timestamp: submission.metadata.timestamp
    }
}

exports.insertNewAssign = async function (assign) {
    let assignToInsert = extractValidFields(assign, exports.AssignmentSchema);
    assignToInsert.courseId = new ObjectId(assignToInsert.courseId);

    const db = getDBReference();
    const collection = db.collection('assignments');
    const result = await collection.insertOne(assignToInsert);
    const course_collection = db.collection('courses');
    await course_collection.updateOne(
            { _id: new ObjectId(assignToInsert.courseId) },
            { $addToSet: { assignments: new ObjectId(result.insertedId) }}
    );
    return result.insertedId
}

exports.getAssignById = async (id) => {
    const db = getDBReference();
    const collection = db.collection('assignments');
    if (!ObjectId.isValid(id)) {
        return null;
    } else {
        const results = await collection
            .find({ _id: new ObjectId(id) })
            .project({ submissions: 0 })
            .toArray();

        return results[0];
    }
}

exports.updateAssignById = async function (id, assign) {
    const db = getDBReference();
    const collection = db.collection('assignments');

    if (!ObjectId.isValid(id)) {
        return null;
    } else {
        assign = extractValidFields(assign, AssignmentSchema);
        const results = await collection.updateOne(
            { _id: new ObjectId(id) },
            { $set: assign }
        );
        return results.matchedCount > 0;
    }
}

exports.removeAssignById = async function (id) {
    const db = getDBReference();
    const collection = db.collection('assignments');

    if(!ObjectId.isValid(id)) {
        return null;
    } else {
        const results = await collection.deleteOne(
            { _id: new ObjectId(id) }
        );
        return results.deletedCount > 0;
    }
}

exports.getSubmissionPage = async function (p, aid, sid) {
    const db = getDBReference();
    const bucket = new GridFSBucket(db, {
        bucketName: 'submissions'
    });

    const count = await db.collection('submissions.files').countDocuments();

    let page = parseInt(p) || 1;
    /*
     * Compute last page number and make sure page is within allowed bounds.
     * Compute offset into collection.
     */
    const pageSize = 10;
    const lastPage = Math.ceil(count / pageSize);
    page = page > lastPage ? lastPage : page;
    page = page < 1 ? 1 : page;
    const offset = (page - 1) * pageSize;

    const search = {
        "metadata.assignmentId": new ObjectId(aid),
        "metadata.studentId": new ObjectId(sid)
    }

    const results = await bucket.find(search)
        .sort({ _id: 1 })
        .skip(offset)
        .limit(pageSize)
        .toArray();

    if (results) {
        for (let i = 0; i < results.length; i++) {
            results[i] = getSubmissionResponseBody(results[i]);
        }
    }

    return {
        submissions: results,
        page: page,
        totalPages: lastPage,
        pageSize: pageSize,
        count: count
    };
}

exports.insertNewSubmissionById = async function (submission) {
    return new Promise((resolve, reject) => {
        const db = getDBReference();
        const bucket = new GridFSBucket(db, {
            bucketName: 'submissions'
        });
        const metadata = {
            contentType: submission.contentType,
            assignmentId: new ObjectId(submission.assignmentId),
            studentId: new ObjectId(submission.studentId),
            timestamp: submission.timestamp
        };

        const uploadStream = bucket.openUploadStream(
            submission.filename,
            { metadata: metadata }
        );
        fs.createReadStream(submission.path).pipe(uploadStream)
            .on('error', (err) => {
                reject(err);
            })
            .on('finish', (result) => {
                resolve(result._id);
            });
    });
}

exports.removeUploadedSubmission = function (file) {
    return new Promise((resolve, reject) => {
        fs.unlink(file.path, (err) => {
            if (err) {
                reject(err);
            } else {
                resolve();
            }
        });
    });
};
