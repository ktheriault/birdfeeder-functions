const functions = require("firebase-functions");
const admin = require("firebase-admin");
const foreach = require("lodash.foreach");
const get = require("lodash.get");
const CONSTANTS = require("../constants");
const PUBLIC_SAVE_DATA_KEYS = CONSTANTS.PUBLIC_SAVE_DATA_KEYS;

exports.getBirdVisitMetadatas = (userId, saveId, gameDataJson) => {
  const birdVisitMetadatas = [];

  if (gameDataJson) {
    // { timestampMs: 1, timestampMs: -1, timestampMs: 1, timestampMs: 1 }
    const visitsByTimeMs = {};

    const gameDataObj = JSON.parse(gameDataJson);
    const savedBirdVisitsList = get(gameDataObj, "SavedBirdVisits.SavedBirdVisitsList");
    savedBirdVisitsList.forEach(savedBirdVisit => {
      const startTimestamp = get(savedBirdVisit, "VisitStartTimestamp");
      const endTimestamp = get(savedBirdVisit, "VisitEndTimestamp");
      visitsByTimeMs[startTimestamp] = startTimestamp in visitsByTimeMs ?
        visitsByTimeMs[startTimestamp] + 1 :
        1;
      visitsByTimeMs[endTimestamp] = endTimestamp in visitsByTimeMs ?
        visitsByTimeMs[endTimestamp] - 1 :
        -1;
    });

    const timeMsList = Object.keys(visitsByTimeMs);
    timeMsList.sort((t1, t2) => t1 > t2 ? 1 : -1);

    let maxBirdCount = 0;
    let count = 0;
    timeMsList.forEach((timeMs, i) => {
      count += visitsByTimeMs[timeMs];
      if (count > maxBirdCount) {
        maxBirdCount = count;
      }
    });
    console.log(timeMsList.toString());
    console.log(timeMsList[0], timeMsList[timeMsList.length - 1]);

    if (timeMsList.length > 1) {
      birdVisitMetadatas.push({
        validAt: admin.firestore.Timestamp.fromMillis(timeMsList[0]),
        validUntil: admin.firestore.Timestamp.fromMillis(timeMsList[timeMsList.length - 1]),
        score: maxBirdCount,
        userId,
        saveId,
      });
    }
    console.log(birdVisitMetadatas);
    // Later: Have multiple metadatas representing different points in time
  }

  return birdVisitMetadatas;
};

exports.getPublicInfoFromSave = (gameDataJson) => {
  const publicInfo = {};
  const gameDataObj = JSON.parse(gameDataJson);
  foreach(gameDataObj, (value, key) => {
    if (PUBLIC_SAVE_DATA_KEYS[key]) {
      publicInfo[key] = value;
    }
  });
};
