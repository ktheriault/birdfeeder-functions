const functions = require("firebase-functions");
const admin = require("firebase-admin");
const get = require("lodash.get");

const CONSTANTS = require("../../constants");
const MAX_FAVORITES_COUNT = CONSTANTS.MAX_FAVORITES_COUNT;

module.exports = functions.https.onCall((data, context) => {
  const db = admin.firestore();

  const userId = get(context, "auth.uid");
  if (!userId) {
    throw new Error("User ID required");
  }

  const favoritedId = get(data, "favoritedId");
  if (!favoritedId) {
    throw new Error("Favorited ID required");
  }

  const favoriteCountRef = db.collection("favoriteCounts").doc(userId);
  const favoritedCountRef = db.collection("favoritedCounts").doc(favoritedId);
  const favoriteQuery = db.collection("favorites")
    .where("userId", "==", userId)
    .where("favoritedId", "==", favoritedId)
    .limit(MAX_FAVORITES_COUNT);

  return favoriteQuery.get()
    .then(querySnapshot => {
      if (querySnapshot.empty) {
        return;
      }
      const favoriteRef = get(querySnapshot, "docs[0].ref");
      return db.runTransaction(t => {
        t.delete(favoriteRef);
        t.set(favoriteCountRef, {
          count: admin.firestore.FieldValue.increment(-1),
        }, { merge: true });
        t.set(favoritedCountRef, {
          count: admin.firestore.FieldValue.increment(-1),
        }, { merge: true });
        return;
      });
    });
});
