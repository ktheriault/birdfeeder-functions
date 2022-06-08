const functions = require("firebase-functions");
const admin = require("firebase-admin");
const get = require("lodash/get");

const birdVisitUtils = require("../../utils/birdVisits");
const CONSTANTS = require("../../constants");
const MAX_SAVE_COUNT = CONSTANTS.MAX_SAVE_COUNT;

module.exports = functions.https.onCall((data, context) => {
  const db = admin.firestore();

  const userId = get(context, "auth.uid");
  if (!userId) {
    throw new Error("User ID required");
  }
  const gameDataJson = get(data, "gameDataJson");
  if (!gameDataJson) {
    throw new Error("Save data required");
  }

  const saveCountRef = db.collection("cloudSaveCounts").doc(userId);
  const savesQuery = db.collection("cloudSaves")
      .where("userId", "==", userId)
      .orderBy("timestamp", "asc")
      .limit(MAX_SAVE_COUNT);
  const newSaveRef = db.collection("cloudSaves").doc();

  let previousSaveCount = 0;
  let saveId; // for bird visit metadata

  return db.runTransaction(t => {
    return t.get(saveCountRef)
        .then(doc => {
          if (doc.exists) {
            previousSaveCount = doc.data().count;
          }
          if (previousSaveCount >= MAX_SAVE_COUNT) {
            return t.get(savesQuery)
                .then(querySnapshot => {
                  if (!querySnapshot.empty) {
                    const oldestSaveDocRef = get(querySnapshot, "docs[0].ref");
                    t.delete(oldestSaveDocRef);
                  }
                });
          }
          return;
        }).then(() => {
          t.create(newSaveRef, {
            userId: userId,
            gameDataJson: gameDataJson,
            createdAt: admin.firestore.FieldValue.serverTimestamp(),
          });
          if (previousSaveCount < MAX_SAVE_COUNT) {
            t.set(saveCountRef, {
              count: previousSaveCount + 1,
            }, { merge: true });
          }
        // Save current bird visit metadata
        // Overwrite old bird visit metadata
        });
  });
});
