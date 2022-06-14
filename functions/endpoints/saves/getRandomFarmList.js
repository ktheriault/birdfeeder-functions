const functions = require("firebase-functions");
const admin = require("firebase-admin");
const get = require("lodash.get");

const birdVisitUtils = require("../../utils/birdVisits");
const friendUtils = require("../../utils/friends");
const {
  MAX_RANDOM_FARMS_LIMIT,
} = require("../../constants");

module.exports = functions.https.onCall((data, context) => {
  const db = admin.firestore();

  const myUserId = get(context, "auth.uid");

  const offset = get(data, "offset") || 0;
  const limit = get(data, "limit") || MAX_RANDOM_FARMS_LIMIT;
  const cappedLimit = limit > MAX_RANDOM_FARMS_LIMIT ? MAX_RANDOM_FARMS_LIMIT : limit;

  const currentDate = new Date();
  let dataList = [];
  let dedupedDocs = [];

  // Later: delete objects with invalid validUntils, so can call and sort by score
  return db.collection("birdVisitMetadata")
    .where("validUntil", ">", currentDate)
    .limit(cappedLimit)
    .offset(offset)
    .get()
    .then(querySnapshot => {
      if (querySnapshot.empty) {
        return false;
      }
      console.log("number of docs:", querySnapshot.docs.length);
      const userIds = {};
      dedupedDocs = querySnapshot.docs.filter(doc => {
        const userId = get(doc.data(), "userId");
        if (!(userId in userIds) && userId != myUserId) {
          userIds[userId] = true;
          return true;
        }
        return false;
      });
      return Promise.all(dedupedDocs.map(doc => {
        const userId = get(doc.data(), "userId");
        return friendUtils.getIsFriendshipNotBlocked(myUserId, userId);
      }));
    }).then(blockStatuses => {
      if (!blockStatuses) {
        return;
      }
      const deblockedDocs = dedupedDocs.filter((doc, i) => {
        return get(blockStatuses, `[${i}]`) === true;
      });
      return Promise.all(deblockedDocs.map(doc => {
        const saveId = get(doc.data(), "saveId");
        return db.collection("cloudSaves").doc(saveId).get();
      }));
    }).then(docs => {
      if (!docs) {
        return;
      }
      dataList = docs.map(doc => {
        return {
          userId: get(doc.data(), "userId"),
          gameDataJson: birdVisitUtils.getPublicInfoFromSave(get(doc.data(), "gameDataJson")),
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
      if (!docs) {
        return dataList;
      }
      dataList = dataList.map((data, i) => {
        const hasProfile = docs[i].exists;
        return {
          ...data,
          username: hasProfile ? get(docs[i].data(), "username") : null,
        };
      });
      console.log("dataList with usernames:", dataList);
      return dataList;
      // TODO: Get online skin data
      // return Promise.all(dataList.map(data => db.collection("skins").doc(userId).get()))
    });
});
