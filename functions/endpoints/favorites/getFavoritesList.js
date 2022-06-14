const functions = require("firebase-functions");
const admin = require("firebase-admin");
const get = require("lodash.get");

const CONSTANTS = require("../../constants");
const MAX_FAVORITES_COUNT = CONSTANTS.MAX_FAVORITES_COUNT;

module.exports = functions.https.onCall((data, context) => {
  const db = admin.firestore();

  const userId = get(context, "auth.uid");
  if (!userId) {
    throw new Error("User ID required");
  }

  let dataList = [];

  return db.collection("favorites")
    .where("userId", "==", userId)
    .orderBy("createdAt", "desc")
    .limit(MAX_FAVORITES_COUNT)
    .get()
    .then(querySnapshot => {
      dataList = querySnapshot.docs.map(doc => get(doc.data()));
      return Promise.all(querySnapshot.docs.map(doc => {
        const favoritedUserId = get(doc.data(), "favoritedUserId");
        if (favoritedUserId) {
          return db.collection("profiles").doc(favoritedUserId).get();
        }
        return null;
      }));
    }).then(docs => {
      dataList = dataList.map((data, i) => {
        const docExists = docs[i] && docs[i].exists;
        const username = docExists ? get(docs[i].data(), "username", null) : null;
        return {
          favoritedId: get(data, "favoritedId"),
          timestamp: get(data, "createdAt").toMillis(),
          username,
        };
      });
      return dataList;
    });
});
