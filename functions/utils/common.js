const functions = require("firebase-functions");
const admin = require("firebase-admin");
const get = require("lodash/get");

exports.getCount = (userId, dbName) => {
  return new Promise((resolve, reject) => {
    const db = admin.firestore();
    db.collection(dbName)
        .doc(userId)
        .get()
        .then((doc) => {
          if (doc.exists) {
            resolve(get(doc.data(), "count"));
          } else {
            resolve(null);
          }
        });
  });
};

exports.changeCount = (userId, delta, dbName) => {
  return new Promise((resolve, reject) => {
    const db = admin.firestore();
    db.collection(dbName)
        .doc(userId)
        .get()
        .then((doc) => {
          if (doc.exists) {
            const newCount = get(doc.data(), "count") + delta;
            return doc.ref.set({ count: newCount }, { merge: true });
          } else {
            return db.collection(dbName).doc(userId).set({ count: delta });
          }
        }).then(() => {
          resolve(true);
        });
  });
};

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
