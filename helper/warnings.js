import { getDb } from './db.js'

const filePath = "./data/warnings.json";

async function addWarning(guildId, userId, moderatorId, reason) {
    const db = getDb();
    const warningsCollection = db.collection('warnings');

    // count existing warnings in server for user to new
    const count = await warningsCollection.countDocuments({guildId, userId});
    const caseNum = count + 1;

    const warning = {
        guildId,
        userId,
        moderatorId,
        reason,
        case: caseNum,
        timestamp: new Date()
    };

    // insert warning into MongoDB
    await warningsCollection.insertOne(warning);

    return warning;
}

async function getWarnings(guildId, userId) {
    const db = getDb();
    const warningsCollection = db.collection('warnings');

    // find all matching warnings as an array
    const warnings = await warningsCollection
        .find({guildId,userId})
        .sort({ case: 1})
        .toArray();

    return warnings;
}

export {
    addWarning,
    getWarnings
};