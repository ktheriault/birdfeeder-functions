const functions = require("firebase-functions");
const admin = require("firebase-admin");
const get = require("lodash.get");

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
    .orderBy("createdAt", "desc")
    .limit(1)
    .get()
    .then(querySnapshot => {
      if (!querySnapshot.empty) {
        const latestSaveData = get(querySnapshot, "docs[0]");
        gameDataJson = get(latestSaveData.data(), "gameDataJson");
        const createdAt = get(latestSaveData.data(), "createdAt");
        timestamp = createdAt.toMillis();
      }
      return {
        gameDataJson,
        timestamp,
      };
    });
});
