const functions = require("firebase-functions");
const admin = require("firebase-admin");
const get = require("lodash/get");
const CONSTANTS = require("../constants");
const MAX_SAVE_COUNT = CONSTANTS.MAX_SAVE_COUNT;

const saveCloudSave = functions.https.onCall((data, context) => {
  const db = admin.firestore();

  const userId = get(context, "auth.uid");
  if (!userId) {
    throw new Error("User ID required");
  }
  const saveData = get(data, "saveData");
  if (!saveData) {
    throw new Error("Save data required");
  }

  const cloudSave = {
    userId: userId,
    data: saveData,
    timestamp: admin.firestore.FieldValue.serverTimestamp(),
  };

  let previousSaveCount = 0;

  return db.collection("cloudSaveCounts").doc(userId).get().then(doc => {
    if (doc.exists) {
      previousSaveCount = doc.data().count;
    }
    return;
  }).then(() => {
    if (previousSaveCount >= MAX_SAVE_COUNT) {
      return db.collection("cloudSaves")
          .where("userId", "==", userId)
          .orderBy("timestamp", "asc")
          .get()
          .then(querySnapshot => {
            const oldestSaveDocId = get(querySnapshot, "docs[0].id");
            return db.collection("cloudSaves").doc(oldestSaveDocId).delete();
          });
    } else {
      return;
    }
  }).then(() => {
    return db.collection("cloudSaves").add(cloudSave);
  }).then(() => {
    // Save metadata
    return;
  });
});

module.exports = saveCloudSave;
