const functions = require("firebase-functions");
const admin = require("firebase-admin");
const get = require("lodash.get");

const CONSTANTS = require("../../constants");
const START_MAX_FRIEND_COUNT = CONSTANTS.START_MAX_FRIEND_COUNT;
const END_MAX_FRIEND_COUNT = CONSTANTS.END_MAX_FRIEND_COUNT;

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

  if (acceptingId == requestingId) {
    throw new Error("Can't be friends with yourself");
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

  let acceptingIdMaxFriendCount = START_MAX_FRIEND_COUNT;
  let requestingIdMaxFriendCount = START_MAX_FRIEND_COUNT;
  let requestingIdPendingFriendCount = 0;
  let acceptingIdCurrentFriendCount = 0;
  let requestingIdCurrentFriendCount = 0;
  let canAddFriend = true;

  return friendshipQuery.get()
    .then(querySnapshot => {
      if (!querySnapshot.empty) {
        canAddFriend = false;
        return;
      }

      return friendBlockQuery.get();
    }).then(querySnapshot => {
      if (!canAddFriend) {
        return;
      }

      if (!querySnapshot.empty) {
        canAddFriend = false;
        return;
      }

      return db.runTransaction(t => {
        return t.getAll(
          requestingIdProfileRef,
          acceptingIdProfileRef,
          requestingIdPendingFriendCountRef,
          requestingIdFriendCountRef,
          acceptingIdFriendCountRef,
        ).then(docs => {
          const requestingIdProfileDoc = docs[0];
          const acceptingIdProfileDoc = docs[1];
          const requestingIdPendingFriendCountDoc = docs[2];
          const requestingIdFriendCountDoc = docs[3];
          const acceptingIdFriendCountDoc = docs[4];

          if (requestingIdProfileDoc.exists) {
            const maxFriendCount = get(requestingIdProfileDoc.data(), "maxFriendCount", START_MAX_FRIEND_COUNT);
            requestingIdMaxFriendCount = Math.min(maxFriendCount, END_MAX_FRIEND_COUNT);
          }
          if (acceptingIdProfileDoc.exists) {
            const maxFriendCount = get(acceptingIdProfileDoc.data(), "maxFriendCount", START_MAX_FRIEND_COUNT);
            acceptingIdMaxFriendCount = Math.min(maxFriendCount, END_MAX_FRIEND_COUNT);
          }
          if (requestingIdPendingFriendCountDoc.exists) {
            requestingIdPendingFriendCount = get(requestingIdPendingFriendCountDoc.data(), "count", 0);
          }
          if (requestingIdFriendCountDoc.exists) {
            requestingIdCurrentFriendCount = get(requestingIdFriendCountDoc.data(), "count", 0);
          }
          if (acceptingIdFriendCountDoc.exists) {
            acceptingIdCurrentFriendCount = get(acceptingIdFriendCountDoc.data(), "count", 0);
          }

          if (requestingIdPendingFriendCount >= requestingIdMaxFriendCount) {
            return;
          }
          if (requestingIdCurrentFriendCount >= requestingIdMaxFriendCount ||
              acceptingIdCurrentFriendCount >= acceptingIdMaxFriendCount) {
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
});
