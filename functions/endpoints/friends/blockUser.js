const functions = require("firebase-functions");
const admin = require("firebase-admin");
const get = require("lodash.get");

const friendsUtils = require("../../utils/friends");

module.exports = functions.https.onCall((data, context) => {
  const db = admin.firestore();

  const userId = get(context, "auth.uid");
  if (!userId) {
    throw new Error("User ID required");
  }

  const blockedId = get(data, "blockedId");
  if (!blockedId) {
    throw new Error("Blocked ID required");
  }

  if (userId == blockedId) {
    throw new Error("Can't block yourself");
  }

  return friendsUtils.blockUser(userId, blockedId);
});
