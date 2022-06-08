const functions = require("firebase-functions");
const admin = require("firebase-admin");
const get = require("lodash/get");

const CONSTANTS = require("../constants");
const MAX_FAVORITES_COUNT = CONSTANTS.MAX_FAVORITES_COUNT;

module.exports = functions.https.onCall((data, context) => {
  const db = admin.firestore();

  const userId = get(context, "auth.uid");
  if (!userId) {
    throw new Error("User ID required");
  }

  return db.collection("favorites")
      .where("userId", "==", userId)
      .orderBy("timestamp", "desc")
      .limit(MAX_FAVORITES_COUNT)
      .get()
      .then(querySnapshot => {
        return querySnapshot.docs.map(doc => get(doc.data(), "favoritedUserId"));
      });
});
