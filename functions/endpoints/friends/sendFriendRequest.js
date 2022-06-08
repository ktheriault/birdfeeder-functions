const functions = require("firebase-functions");
const admin = require("firebase-admin");
const get = require("lodash/get");

const friendsUtils = require("../../utils/friends");
const utils = require("../../utils/common");
const CONSTANTS = require("../../constants");
const START_MAX_FRIENDS_COUNT = CONSTANTS.START_MAX_FRIENDS_COUNT;
const END_MAX_FRIENDS_COUNT = CONSTANTS.END_MAX_FRIENDS_COUNT;

module.exports = functions.https.onCall((data, context) => {
  const db = admin.firestore();

  const requestingId = get(context, "auth.uid");
  if (!requestingId) {
    throw new Error("User ID required");
  }

  const acceptingId = get(data, "acceptingId");
  if (!acceptingId) {
    throw new Error("Accepting ID required");
  }

  const requestingIdProfileRef = db.collection("profiles").doc(requestingId);
  const acceptingIdProfileRef = db.collection("profiles").doc(acceptingId);
  const requestingIdPendingFriendCountRef = db.collection("pendingFriendCounts").doc(requestingId);
  const requestingIdFriendCountRef = db.collection("friendCounts").doc(requestingId);
  const acceptingIdFriendCountRef = db.collection("friendCounts").doc(acceptingId);
  const friendshipQuery = db.collection("friends")
      .where(`idObj[${requestingId}]`, "==", true)
      .where(`idObj[${acceptingId}]`, "==", true)
      .limit(1);
  const friendBlockQuery = db.collection("friendBlocks")
      .where(`idObj[${requestingId}]`, "==", true)
      .where(`idObj[${acceptingId}]`, "==", true)
      .limit(1);
  const newFriendshipRef = db.collection("friends").doc();

  let acceptingIdMaxFriendsCount = START_MAX_FRIENDS_COUNT;
  let requestingIdMaxFriendsCount = START_MAX_FRIENDS_COUNT;
  let requestingIdPendingFriendCount = 0;
  let acceptingIdCurrentFriendCount = 0;
  let requestingIdCurrentFriendCount = 0;

  return db.runTransaction(t => {
    return t.getAll(
        requestingIdProfileRef,
        acceptingIdProfileRef,
        requestingIdPendingFriendCountRef,
        requestingIdFriendCountRef,
        acceptingIdFriendCountRef,
        friendshipQuery,
        friendBlockQuery
    ).then((docs) => {
      if (docs[0].exists) {
        const maxFriendCount = get(docs[0].data(), "maxFriendCount", START_MAX_FRIENDS_COUNT);
        requestingIdMaxFriendsCount = Math.min(maxFriendCount, END_MAX_FRIENDS_COUNT);
      }
      if (docs[1].exists) {
        const maxFriendCount = get(docs[1].data(), "maxFriendCount", START_MAX_FRIENDS_COUNT);
        acceptingIdMaxFriendsCount = Math.min(maxFriendCount, END_MAX_FRIENDS_COUNT);
      }
      if (docs[2].exists) {
        requestingIdPendingFriendCount = get(docs[2].data(), "count", 0);
      }
      if (docs[3].exists) {
        requestingIdCurrentFriendCount = get(docs[3].data(), "count", 0);
      }
      if (docs[4].exists) {
        acceptingIdCurrentFriendCount = get(docs[4].data(), "count", 0);
      }

      if (!docs[5].empty || !docs[6].empty || !docs[7].empty || !docs[8].empty) {
        return;
      }

      if (requestingIdPendingFriendCount >= requestingIdMaxFriendsCount) {
        return;
      }
      if (requestingIdCurrentFriendCount >= requestingIdMaxFriendsCount ||
          acceptingIdCurrentFriendCount >= acceptingIdMaxFriendsCount) {
        return;
      }

      t.create(newFriendshipRef, {
        requestingId: requestingId,
        acceptingId: acceptingId,
        idList: [requestingId, acceptingId],
        idObj: { [requestingId]: true, [acceptingId]: true },
        requestedAt: admin.firestore.FieldValue.serverTimestamp,
        acceptedAt: null,
      });

      // Only your pendingCount goes up
      // Don't want to make it impossible for popular people to get requests they actually want
      t.set(requestingIdPendingFriendCountRef, {
        count: requestingIdPendingFriendCount + 1,
      }, { merge: true });

      return;
    });
  });
});
