const functions = require("firebase-functions");
const admin = require("firebase-admin");
const get = require("lodash.get");

const birdVisitUtils = require("../../utils/birdVisits");
const friendUtils = require("../../utils/friends");
const CONSTANTS = require("../../constants");
const MAX_FRIENDS_LIMIT = CONSTANTS.MAX_FRIENDS_LIMIT;

module.exports = functions.https.onCall((data, context) => {
  const db = admin.firestore();

  const myUserId = get(context, "auth.uid");

  const offset = get(data, "offset") || 0;
  const limit = get(data, "limit") || MAX_FRIENDS_LIMIT;
  const cappedLimit = limit > MAX_FRIENDS_LIMIT ? MAX_FRIENDS_LIMIT : limit;

  const currentDate = new Date();
  let dataList = [];

  return db.collection("birdVisitMetadata")
    .where("createdAt", "<", new Date())
    .where("validUntil", ">", currentDate)
    .orderBy("score", "desc")
    .limit(cappedLimit)
    .offset(offset)
    .get()
    .then(querySnapshot => {
      if (querySnapshot.empty) {
        return false;
      }
      const userIds = {};
      const dedupedDocs = querySnapshot.docs.filter(doc => {
        const userId = get(doc.data(), "userId");
        if (!(userId in userIds) && userId != myUserId) {
          userIds[userId] = true;
          return true;
        }
        return false;
      });
      return Promise.all(dedupedDocs.filter(doc => {
        const userId = get(doc.data(), "userId");
        return !friendUtils.getIsUserBlocked(myUserId, userId);
      }));
    }).then(deblockedDocs => {
      return Promise.all(deblockedDocs.map(doc => {
        const saveId = get(doc.data(), "saveId");
        return db.collection("cloudSaves").doc(saveId).get();
      }));
    }).then(docs => {
      dataList = docs.map(doc => {
        return {
          userId: doc.userId,
          data: birdVisitUtils.getPublicInfoFromSave(get(doc.data(), "gameDataJson")),
        };
      });
      return Promise.all(dataList.map(data => {
        const userId = get(data, "userId");
        if (userId) {
          return db.collection("profiles").doc(userId).get();
        } else {
          return null;
        }
      }));
    }).then(docs => {
      dataList = dataList.map((data, i) => {
        return {
          ...data,
          username: get(docs[i].data(), "username"),
        };
      });
      return dataList;
      // TODO: Get online skin data
      // return Promise.all(dataList.map(data => db.collection("skins").doc(userId).get()))
    });
});
