const functions = require("firebase-functions");
const admin = require("firebase-admin");
const get = require("lodash/get");

const CONSTANTS = require("../../constants");
const MAX_FRIENDS_LIMIT = CONSTANTS.MAX_FRIENDS_LIMIT;

module.exports = functions.https.onCall((data, context) => {
  const db = admin.firestore();

  const userId = get(context, "auth.uid");
  if (!userId) {
    throw new Error("User ID required");
  }

  const offset = get(data, "offset") || 0;
  const limit = get(data, "limit") || MAX_FRIENDS_LIMIT;
  const cappedLimit = limit > MAX_FRIENDS_LIMIT ? MAX_FRIENDS_LIMIT : limit;

  return db.collection("friends")
      .where("requestingId", "==", userId)
      .where("acceptedAt", "==", null)
      .offset(offset)
      .limit(cappedLimit)
      .get();
});
