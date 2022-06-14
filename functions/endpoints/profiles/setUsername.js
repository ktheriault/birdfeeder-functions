const functions = require("firebase-functions");
const admin = require("firebase-admin");
const get = require("lodash.get");

module.exports = functions.https.onCall((data, context) => {
  const db = admin.firestore();

  const userId = get(context, "auth.uid");
  if (!userId) {
    throw new Error("User ID required");
  }

  const username = get(data, "username");
  if (!username && username != "") {
    throw new Error("Username required");
  }

  const usernameRef = db.collection("profiles").doc(userId);

  return usernameRef.set({
    username,
  }, { merge: true });
});
