const functions = require("firebase-functions");
const admin = require("firebase-admin");
const get = require("lodash.get");
const utils = require("./common");
const CONSTANTS = require("../constants");
const START_MAX_FRIENDS_COUNT = CONSTANTS.START_MAX_FRIEND_COUNT;

exports.getHasReachedFriendRequestLimit = (userId) => {
  return new Promise((resolve, reject) => {
    const db = admin.firestore();
    let maxFriendCount = START_MAX_FRIENDS_COUNT;
    return db.collection("profiles").doc(userId).get()
      .then((doc) => {
        if (doc.exists) {
          maxFriendCount = get(doc.data(), "maxFriendCount", START_MAX_FRIENDS_COUNT);
        }
        return utils.getHasReachedLimit(userId, maxFriendCount, "friendCounts")
          .then((hasReachedFriendLimit) => {
            if (hasReachedFriendLimit) {
              resolve(false);
            }
            return utils.getHasReachedLimit(userId, maxFriendCount, "pendingFriendCounts");
          }).then((hasReachedPendingFriendLimit) => {
            resolve(hasReachedPendingFriendLimit);
          });
      });
  });
};

exports.getCanAddFriend = (requestingId, acceptingId) => {
  return new Promise((resolve, reject) => {
    if (requestingId == acceptingId) {
      resolve(false);
    }
    getHasCurrentOrPendingFriendship(requestingId, acceptingId)
      .then((hasCurrentOrPendingFriendship) => {
        if (hasCurrentOrPendingFriendship) {
          resolve(false);
        } else {
          return getIsFriendshipBlocked(requestingId, acceptingId);
        }
      }).then((isFriendshipBlocked) => {
        if (isFriendshipBlocked) {
          resolve(false);
        } else {
          resolve(true);
        }
        return;
      });
  });
};

exports.blockUser = (userId, blockedId) => {
  return new Promise((resolve, reject) => {
    const db = admin.firestore();
    db.collection("friendBlocks")
      .where("userId", "==", userId)
      .where("blockedId", "==", blockedId)
      .limit(1)
      .get()
      .then(querySnapshot => {
        if (!querySnapshot.empty) {
          resolve(true);
        } else {
          return db.collection("friendBlocks").doc().add({
            userId,
            blockedId,
            idList: [userId, blockedId],
            idObj: { [userId]: true, [blockedId]: true },
            firstBlockedAt: admin.firestore.FieldValue.serverTimestamp,
          });
        }
      }).then(() => {
        resolve(true);
      });
  });
};

exports.unblockUser = (userId, blockedId) => {
  return new Promise((resolve, reject) => {
    const db = admin.firestore();
    db.collection("friendBlocks")
      .where("userId", "==", userId)
      .where("blockedId", "==", blockedId)
      .limit(1)
      .get()
      .then(querySnapshot => {
        if (querySnapshot.empty) {
          resolve(false);
        } else {
          const blockId = querySnapshot.docs[0].id;
          return db.collection("friendBlocks").doc(blockId).delete();
        }
      }).then(() => {
        resolve(true);
      });
  });
};

exports.getIsUserBlocked = (userId1, userId2) => {
  return getIsFriendshipBlocked(userId1, userId2);
};

function getHasCurrentOrPendingFriendship(requestingId, acceptingId) {
  return new Promise((resolve, reject) => {
    const db = admin.firestore();
    db.collection("friends")
      .where(`idObj[${requestingId}]`, "==", true)
      .where(`idObj[${acceptingId}]`, "==", true)
      .limit(1)
      .get()
      .then((querySnapshot) => {
        resolve(!querySnapshot.empty);
      });
  });
}

function getIsFriendshipBlocked(userId1, userId2) {
  return new Promise((resolve, reject) => {
    const db = admin.firestore();
    db.collection("friendBlocks")
      .where(`idObj[${userId1}]`, "==", true)
      .where(`idObj[${userId2}]`, "==", true)
      .limit(1)
      .get()
      .then(querySnapshot => {
        resolve(!querySnapshot.empty);
      });
  });
}

