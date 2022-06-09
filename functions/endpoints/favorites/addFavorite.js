const functions = require("firebase-functions");
const admin = require("firebase-admin");
const get = require("lodash.get");

const {
  START_MAX_FAVORITE_COUNT,
  END_MAX_FAVORITE_COUNT,
} = require("../../constants");

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

  const profileRef = db.collection("profiles").doc(userId);
  const favoriteCountRef = db.collection("favoriteCounts").doc(userId);
  const favoritedCountRef = db.collection("favoritedCounts").doc(favoritedId);
  const existingFavoritesQuery = db.collection("favorites")
    .where("userId", "==", userId)
    .where("favoritedId", "==", favoritedId)
    .limit(1);
  const newFavoriteRef = db.collection("favorites").doc();
  let maxFavoriteCount = START_MAX_FAVORITE_COUNT;
  let favoriteCount = 0;
  let favoritedCount = 0;

  return existingFavoritesQuery.get()
    .then(querySnapshot => {
      if (!querySnapshot.empty) {
        return;
      }

      return db.runTransaction(t => {
        return t.getAll(
          profileRef,
          favoriteCountRef,
          favoritedCountRef,
        ).then(docs => {
          const profileDoc = docs[0];
          const favoriteCountDoc = docs[1];
          const favoritedCountDoc = docs[2];

          if (profileDoc.exists) {
            maxFavoriteCount = get(profileDoc.data(), "maxFavoriteCount", START_MAX_FAVORITE_COUNT);
            maxFavoriteCount = Math.min(profileDoc, END_MAX_FAVORITE_COUNT);
          }
          if (favoriteCountDoc.exists) {
            favoriteCount = get(favoriteCountDoc.data(), "count", 0);
          }
          if (favoritedCountDoc.exists) {
            favoritedCount = get(favoritedCountDoc.data(), "count", 0);
          }

          if (favoriteCount < maxFavoriteCount) {
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
            return true;
          }
          return false;
        });
      });
    });
});
