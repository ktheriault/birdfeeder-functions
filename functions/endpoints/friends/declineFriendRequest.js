const functions = require("firebase-functions");
const admin = require("firebase-admin");
const get = require("lodash.get");

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

  const requestingIdPendingFriendCountRef = db.collection("pendingFriendCounts").doc(requestingId);
  const friendshipQuery = db.collection("friends")
    .where("requestingId", "==", requestingId)
    .where("acceptingId", "==", acceptingId)
    .where("acceptedAt", "==", null)
    .limit(1);

  let friendshipRef;
  let requestingIdPendingFriendCount = 0;

  return friendshipQuery.get()
    .then(querySnapshot => {
      if (querySnapshot.empty) {
        return;
      }
      friendshipRef = querySnapshot.docs[0].ref;

      return db.runTransaction(t => {
        return t.get(requestingIdPendingFriendCountRef)
          .then(doc => {
            if (doc.exists) {
              requestingIdPendingFriendCount = get(doc.data(), "count", 0);
            }
            t.delete(friendshipRef);
            t.set(requestingIdPendingFriendCountRef, {
              count: requestingIdPendingFriendCount > 0 ? requestingIdPendingFriendCount - 1 : 0,
            });
          });
      });
    });
});
