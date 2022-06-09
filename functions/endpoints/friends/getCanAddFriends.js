const functions = require("firebase-functions");
const admin = require("firebase-admin");
const get = require("lodash.get");

const friendsUtils = require("../../utils/friends");

module.exports = functions.https.onCall((data, context) => {
  const userId = get(context, "auth.uid");
  if (!userId) {
    throw new Error("User ID required");
  }

  return friendsUtils.getHasReachedFriendRequestLimit(userId);
});
