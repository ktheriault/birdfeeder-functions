const functions = require("firebase-functions");
const admin = require("firebase-admin");
const get = require("lodash/get");
const CONSTANTS = require("../constants");

exports.saveCurrentBirdVisitsMetadata = (userId, saveId, gameDataJson) => {
  return new Promise((resolve, reject) => {
    const db = admin.firestore();

    const birdVisitMetadatas = getBirdVisitMetadatas(userId, saveId, gameDataJson);

    Promise.all(birdVisitMetadatas.map((birdVisitMetadata) => {
      return saveBirdVisitMetadata(birdVisitMetadata);
    }))
        .then(() => {
          resolve(true);
        });
  });
};

exports.deleteOverwrittenBirdVisitsMetadata = (userId, saveId) => {
  return new Promise((resolve, reject) => {
    const db = admin.firestore();
    db.collection("birdVisitMetadata")
        .where("userId", "==", userId)
        .where("saveId", "!=", saveId)
        .get()
        .then((querySnapshot) => {
          return Promise.all(querySnapshot.docs.map(doc => doc.ref.delete()));
        }).then(() => {
          resolve(true);
        });
  });
};

function saveBirdVisitMetadata(birdVisitMetadata) {
  return new Promise((resolve, reject) => {
    const db = admin.firestore();
    db.collection("birdVisitMetadata").doc().add(birdVisitMetadata).then(() => {
      resolve(true);
    });
  });
}

function getBirdVisitMetadatas(userId, saveId, gameDataJson) {
  const birdVisitMetadatas = [];

  const defaultTimeMs = new Date();

  if (gameDataJson) {
    // { timestampMs: 1, timestampMs: -1, timestampMs: 1, timestampMs: 1 }
    const visitsByTimeMs = {};
    // { timestampMs: 1, timestampMs: 0, timestampMs: 1, timestampMs: 2 }
    const birdCountsByTimeMs = {};

    const gameDataObj = JSON.parse(gameDataJson);
    const savedBirdVisitsList = get(gameDataObj, "SavedBirdVisits.SavedBirdVisitsList");
    savedBirdVisitsList.foreach(savedBirdVisit => {
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
    console.log(timeMsList);

    const birdCountsList = [];
    let count = 0;
    let previousTimeMs;
    timeMsList.foreach((timeMs, i) => {
      const newCount = count + visitsByTimeMs[timeMs];
      count += visitsByTimeMs[timeMs];
      const duration = i == timeMsList.length - 1 ? 0 : timeMsList[i + 1] - timeMs;
      birdCountsList.push({
        timeMs,
        count: count,
        duration,
      });
    });

    const condensedVisitsByTimeMs = [];
  }

  return birdVisitMetadatas;
}
