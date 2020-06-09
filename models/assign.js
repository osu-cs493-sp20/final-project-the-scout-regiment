const { ObjectId } = require('mongodb')
const { extractValidFields } = require('../lib/validation');

const AssignmentSchema = {
    courseId: { required: true },
    title: { required: true },
    points: { required: true },
    due: { required: true }
};
exports.AssignmentSchema = this.AssignmentSchema;

const SubmissionSchema = {
    assignmentId: { required: true },
    studentId: { required: true },
    timestamp: { required: true },
    file: { required: true }
}
exports.SubmissionSchema = this.SubmissionSchema

exports.insertNewAssign = async function (assign) {
    const assignToInsert = extractValidFields(assign, AssignmentSchema);

    const db = getDBReference();
    const cellection = db.collection('assignments');
    const result = await collection.insertOne(assignToInsert);
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
            .project({ sumbissions: 0 })
            .toArray();

        return results[0];
    }
}

exports.updateAssignById = async function (id, course) {
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

exports.insertNewSubmissionById = async function (id, sumbission) {
    const subToInsert = extractValidFields(sumbission, SubmissionSchema);
    const db = getDBReference();
    const collection = db.collection('submissions');
    
    subToInsert.assignmentId = id;
    const result = await collection.insertOne(subToInsert);
    return result.insertedId
}