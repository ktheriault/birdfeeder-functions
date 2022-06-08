const functions = require("firebase-functions");
const admin = require("firebase-admin");
const get = require("lodash/get");
const CONSTANTS = require("../constants");
const MAX_FAVORITES_COUNT = CONSTANTS.MAX_FAVORITES_COUNT;

exports.getHasReachedFavoritesLimit = (userId) => {
  return new Promise((resolve, reject) => {
    const db = admin.firestore();
    db.collection("favoriteCounts")
        .doc(userId)
        .get()
        .then(doc => {
          if (doc.exists) {
            const hasReachedLimit = get(doc.data(), "count") >= MAX_FAVORITES_COUNT;
            resolve(hasReachedLimit);
          }
          resolve(false);
        });
  });
};

exports.getCanAddFavorite = (userId, favoritedId) => {
  return new Promise((resolve, reject) => {
    const db = admin.firestore();
    db.collection("favorites")
        .where("userId", "==", userId)
        .where("favoritedId", "==", favoritedId)
        .get()
        .then(querySnapshot => {
          resolve(querySnapshot.empty);
        });
  });
};

exports.changeFavoriteCount = (userId, delta) => {
  return new Promise((resolve, reject) => {
    const db = admin.firestore();
    db.collection("favoriteCounts")
        .doc(userId)
        .get()
        .then((doc) => {
          if (doc.exists) {
            const newCount = get(doc.data(), "count") + delta;
            return doc.ref.set({ count: newCount }, { merge: true });
          } else {
            return db.collection("favoriteCounts").doc(userId).set({ count: delta });
          }
        }).then(() => {
          resolve(true);
        });
  });
};

exports.changeFavoritedCount = (favoritedId, delta) => {
  return new Promise((resolve, reject) => {
    const db = admin.firestore();
    db.collection("favoritedCounts")
        .doc(favoritedId)
        .get()
        .then((doc) => {
          if (doc.exists) {
            const newCount = get(doc.data(), "count") + delta;
            return doc.ref.set({ count: newCount }, { merge: true });
          } else {
            return db.collection("favoritedCounts").doc(favoritedId).set({ count: delta });
          }
        }).then(() => {
          resolve(true);
        });
  });
};

