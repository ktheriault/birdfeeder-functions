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
  const friendshipQuery = db.collection("friends")
    .where(`idObj[${userId}]`, "==", true)
    .where(`idObj[${friendId}]`, "==", true)
    .where("acceptedAt", "!=", null)
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
