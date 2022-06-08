const functions = require("firebase-functions");
const admin = require("firebase-admin");
const get = require("lodash/get");

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
      .where("acceptingId", "==", acceptingId);

  let acceptingIdMaxFriendsCount = START_MAX_FRIENDS_COUNT;
  let requestingIdMaxFriendsCount = START_MAX_FRIENDS_COUNT;
  let acceptingIdCurrentFriendCount = 0;
  let requestingIdCurrentFriendCount = 0;

  return db.runTransaction(t => {
    return t.getAll(
        requestingIdProfileRef,
        acceptingIdProfileRef,
        requestingIdFriendCountRef,
        acceptingIdFriendCountRef,
        friendshipQuery
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
        requestingIdCurrentFriendCount = get(docs[2].data(), "count", 0);
      }
      if (docs[3].exists) {
        acceptingIdCurrentFriendCount = get(docs[3].data(), "count", 0);
      }
      if (docs[4].empty) {
        return;
      }
      if (requestingIdCurrentFriendCount >= requestingIdMaxFriendsCount) {
        return;
      }
      if (acceptingIdCurrentFriendCount >= acceptingIdMaxFriendsCount) {
        return;
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
        count: admin.firestore.FieldValue.increment(-1), // should already exist
      }, { merge: true });
      return;
    });
  });
});
