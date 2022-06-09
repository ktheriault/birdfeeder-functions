const functions = require("firebase-functions");
const admin = require("firebase-admin");
const get = require("lodash.get");

module.exports = functions.https.onCall((data, context) => {
  const db = admin.firestore();

  const userId = get(data, "userId");
  if (!userId) {
    throw new Error("User ID required");
  }

  return db.collection("favoritedCounts")
    .doc(userId)
    .get()
    .then(doc => {
      if (doc.exists) {
        return get(doc.data(), "count");
      }
      return 0;
    });
});
