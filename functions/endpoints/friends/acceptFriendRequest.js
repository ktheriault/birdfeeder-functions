const functions = require("firebase-functions");
const admin = require("firebase-admin");
const get = require("lodash.get");

const CONSTANTS = require("../../constants");
const START_MAX_FRIENDS_COUNT = CONSTANTS.START_MAX_FRIENDS_COUNT;
const END_MAX_FRIENDS_COUNT = CONSTANTS.END_MAX_FRIENDS_COUNT;

module.exports = functions.https.onCall((data, context) => {
  const db = admin.firestore();

  const acceptingId = get(context, "auth.uid");
  if (!acceptingId) {
    throw new Error("User ID required");
  }

  const requestingId = get(data, "requestingId");
  if (!requestingId) {
    throw new Error("Requesting ID required");
  }

  if (acceptingId == requestingId) {
    throw new Error("Can't be friends with yourself");
  }

  const requestingIdPendingFriendCountRef = db.collection("pendingFriendCounts").doc(requestingId);
  const acceptingIdProfileRef = db.collection("profiles").doc(acceptingId);
  const requestingIdProfileRef = db.collection("profiles").doc(requestingId);
  const acceptingIdFriendCountRef = db.collection("friendCounts").doc(acceptingId);
  const requestingIdFriendCountRef = db.collection("friendCounts").doc(requestingId);
  const friendshipQuery = db.collection("friends")
    .where("requestingId", "==", requestingId)
    .where("acceptingId", "==", acceptingId)
    .where("acceptedAt", "==", null)
    .limit(1);

  let requestingIdMaxFriendsCount = START_MAX_FRIENDS_COUNT;
  let acceptingIdMaxFriendsCount = START_MAX_FRIENDS_COUNT;
  let requestingIdPendingFriendCount = 0;
  let requestingIdCurrentFriendCount = 0;
  let acceptingIdCurrentFriendCount = 0;

  return friendshipQuery.get()
    .then(querySnapshot => {
      if (querySnapshot.empty) {
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
            const maxFriendCount = get(requestingIdProfileDoc.data(), "maxFriendCount", START_MAX_FRIENDS_COUNT);
            requestingIdMaxFriendsCount = Math.min(maxFriendCount, END_MAX_FRIENDS_COUNT);
          }
          if (acceptingIdProfileDoc.exists) {
            const maxFriendCount = get(acceptingIdProfileDoc.data(), "maxFriendCount", START_MAX_FRIENDS_COUNT);
            acceptingIdMaxFriendsCount = Math.min(maxFriendCount, END_MAX_FRIENDS_COUNT);
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

          t.set(docs[5].docs[0].ref, {
            acceptedAt: admin.firestore.FieldValue.serverTimestamp,
          }, { merge: true });
          t.set(requestingIdFriendCountRef, {
            count: requestingIdCurrentFriendCount + 1,
          }, { merge: true });
          t.set(acceptingIdFriendCountRef, {
            count: acceptingIdCurrentFriendCount + 1,
          }, { merge: true });
          t.set(requestingIdPendingFriendCountRef, {
            count: requestingIdPendingFriendCount > 0 ? requestingIdPendingFriendCount - 1 : 0,
          }, { merge: true });
          return;
        });
      });
    });
});
