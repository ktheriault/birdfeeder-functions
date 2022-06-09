const functions = require("firebase-functions");
const admin = require("firebase-admin");
const get = require("lodash.get");

exports.getHasReachedLimit = (userId, limitCount, dbName) => {
  return new Promise((resolve, reject) => {
    const db = admin.firestore();
    db.collection(dbName)
      .doc(userId)
      .get()
      .then(doc => {
        if (doc.exists) {
          const hasReachedLimit = get(doc.data(), "count") >= limitCount;
          resolve(hasReachedLimit);
        }
        resolve(false);
      });
  });
};
