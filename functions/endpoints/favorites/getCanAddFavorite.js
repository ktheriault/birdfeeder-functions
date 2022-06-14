const functions = require("firebase-functions");
const admin = require("firebase-admin");
const get = require("lodash.get");

const favoritesUtils = require("../../utils/favorites");

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

  return favoritesUtils.getCanAddFavorite(userId, favoritedId)
    .then((canAdd) => {
      return {
        canAdd,
        favoritedId,
      };
    });
});
