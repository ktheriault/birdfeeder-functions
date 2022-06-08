const functions = require("firebase-functions");
const admin = require("firebase-admin");
const get = require("lodash/get");

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
  const friendshipQuery = db.collection("friends")
      .where("requestingId", "==", requestingId)
      .where("acceptingId", "==", acceptingId)
      .where("acceptedAt", "==", null);

  return db.runTransaction(t => {
    return t.getAll(
        friendshipQuery,
        requestingIdPendingFriendCountRef
    ).then((docs) => {
      if (docs[0].empty) {
        return;
      }

      t.delete(docs[0].docs[0].ref);
      t.set(requestingIdPendingFriendCountRef, {
        count: admin.firestore.FieldValue.increment(-1),
      });
      return;
    });
  });
});
