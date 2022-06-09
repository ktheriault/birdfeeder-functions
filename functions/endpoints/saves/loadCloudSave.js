const functions = require("firebase-functions");
const admin = require("firebase-admin");
const get = require("lodash.get");
const { MAX_SAVE_COUNT } = require("../../constants");

module.exports = functions.https.onCall((data, context) => {
  const db = admin.firestore();

  const userId = get(context, "auth.uid");
  if (!userId) {
    throw new Error("User ID required");
  }

  let gameDataJson = null;
  let timestamp = null;

  return db.collection("cloudSaves")
    .where("userId", "==", userId)
    .orderBy("timestamp", "desc")
    .limit(MAX_SAVE_COUNT)
    .get()
    .then(querySnapshot => {
      if (!querySnapshot.empty) {
        const latestSaveData = get(querySnapshot, "docs[0]");
        gameDataJson = get(latestSaveData.data(), "gameDataJson");
        timestamp = get(latestSaveData.data(), "timestamp");
      }
      return {
        gameDataJson,
        timestamp,
      };
    });
});
