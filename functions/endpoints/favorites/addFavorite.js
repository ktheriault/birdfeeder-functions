const functions = require("firebase-functions");
const admin = require("firebase-admin");
const get = require("lodash/get");

const favoritesUtils = require("../../utils/favorites");

module.exports = functions.https.onCall((data, context) => {
  const timestamp = admin.firestore.FieldValue.serverTimestamp;
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
  const existingFavoritesQuery = db.collection("favorites")
      .where("userId", "==", userId)
      .where("favoritedId", "==", favoritedId);
  const newFavoriteRef = db.collection("favorites").doc();
  let favoriteCount = 0;
  let favoritedCount = 0;

  return db.runTransaction(t => {
    return t.getAll(
        favoriteCountRef,
        favoritedCountRef,
        existingFavoritesQuery
    ).then((docs) => {
      if (docs[0].exists) {
        favoriteCount = get(docs[0].data(), "count", 0);
      }
      if (docs[1].exists) {
        favoritedCount = get(docs[1].data(), "count", 0);
      }
      if (!docs[2].empty) {
        return;
      }

      t.set(newFavoriteRef, {
        userId,
        favoritedId,
        createdAt: admin.firestore.FieldValue.serverTimestamp,
      });
      t.set(favoriteCountRef, {
        count: favoriteCount + 1,
      }, { merge: true });
      t.set(favoritedCountRef, {
        count: favoritedCount + 1,
      }, { merge: true });
      return;
    });
  });
});
