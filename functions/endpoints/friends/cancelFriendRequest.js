const functions = require("firebase-functions");
const admin = require("firebase-admin");
const get = require("lodash.get");

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

  const pendingFriendCountRef = db.collection("pendingFriendCounts").doc(requestingId);
  const friendshipQuery = db.collection("friends")
    .where("requestingId", "==", requestingId)
    .where("acceptingId", "==", acceptingId)
    .where("acceptedAt", "==", null)
    .limit(1);

  return friendshipQuery.get()
    .then(querySnapshot => {
      if (querySnapshot.empty) {
        return;
      }
      const friendshipRef = get(querySnapshot, "docs[0].ref");
      if (!friendshipRef) {
        return;
      }

      return db.runTransaction(t => {
        t.delete(friendshipRef);
        t.update(pendingFriendCountRef, {
          count: admin.firestore.FieldValue.increment(-1),
        });
        return;
      });
    });
});
