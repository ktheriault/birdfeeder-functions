const functions = require("firebase-functions");
const admin = require("firebase-admin");
const get = require("lodash.get");

module.exports = functions.https.onCall((data, context) => {
  const db = admin.firestore();

  const userId = get(context, "auth.uid");
  if (!userId) {
    throw new Error("User ID required");
  }

  const friendId = get(data, "friendId");
  if (!friendId) {
    throw new Error("Friend ID required");
  }

  const userIdFriendCountRef = db.collection("friendCounts").doc(userId);
  const friendIdFriendCountRef = db.collection("friendCounts").doc(friendId);
  const friendshipQuery1 = db.collection("friends")
    .where("requestingId", "==" )
    .where("acceptingId", "==", friendId)
    .where("acceptedAt", "!=", null)
    .limit(1);
  const friendshipQuery2 = db.collection("friends")
    .where("requestingId", "==", friendId)
    .where("acceptingId", "==", userId)
    .where("acceptedAt", "!=", null)
    .limit(1);
  let friendshipRef;

  return friendshipQuery1.get()
    .then(querySnapshot => {
      if (!querySnapshot.empty) {
        friendshipRef = get(querySnapshot, "docs[0].ref");
        return null;
      }

      return friendshipQuery2.get();
    }).then((querySnapshot) => {
      if (!friendshipRef && querySnapshot && !querySnapshot.empty) {
        friendshipRef = get(querySnapshot, "docs[0].ref");
      }

      if (!friendshipRef) {
        return;
      }

      return db.runTransaction(t => {
        t.delete(friendshipRef);
        t.set(userIdFriendCountRef, {
          count: admin.firestore.FieldValue.increment(-1),
        }, { merge: true });
        t.set(friendIdFriendCountRef, {
          count: admin.firestore.FieldValue.increment(-1),
        }, { merge: true });
        return;
      });
    });
});
