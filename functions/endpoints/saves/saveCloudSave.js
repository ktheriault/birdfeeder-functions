const functions = require("firebase-functions");
const admin = require("firebase-admin");
const get = require("lodash.get");

const birdVisitUtils = require("../../utils/birdVisits");
const CONSTANTS = require("../../constants");
const MAX_SAVE_COUNT = CONSTANTS.MAX_SAVE_COUNT;

module.exports = functions.https.onCall((data, context) => {
  const db = admin.firestore();

  const userId = get(context, "auth.uid");
  if (!userId) {
    throw new Error("User ID required");
  }
  const gameDataJson = get(data, "gameDataJson");
  if (!gameDataJson) {
    throw new Error("Save data required");
  }

  const saveCountRef = db.collection("cloudSaveCounts").doc(userId);
  const savesQuery = db.collection("cloudSaves")
    .where("userId", "==", userId)
    .orderBy("timestamp", "asc")
    .limit(1);
  const newSaveRef = db.collection("cloudSaves").doc();
  const oldBirdVisitMetadataQuery = db.collection("birdVisitMetadata")
    .where("userId", "==", userId); // no limit?
  const saveId = newSaveRef.id;

  let oldestSaveDocRef;
  const oldBirdVisitMetadataRefs = [];

  let previousSaveCount = 0;

  return savesQuery.get()
    .then(querySnapshot => {
      if (!querySnapshot.empty) {
        oldestSaveDocRef = get(querySnapshot, "docs[0].ref");
      }

      return oldBirdVisitMetadataQuery.get();
    }).then(querySnapshot => {
      if (!querySnapshot.empty) {
        querySnapshot.docs.forEach(doc => {
          oldBirdVisitMetadataRefs.push(doc.ref);
        });
      }

      return db.runTransaction(t => {
        return t.get(saveCountRef)
          .then(doc => {
            if (doc.exists) {
              previousSaveCount = doc.data().count;
            }

            if (previousSaveCount >= MAX_SAVE_COUNT && oldestSaveDocRef) {
              t.delete(oldestSaveDocRef);
            }

            if (oldBirdVisitMetadataRefs && oldBirdVisitMetadataRefs.length > 0) {
              for (let i = 0; i < oldBirdVisitMetadataRefs.length; i++) {
                t.delete(oldBirdVisitMetadataRefs[i]);
              }
            }

            t.create(newSaveRef, {
              userId: userId,
              gameDataJson: gameDataJson,
              createdAt: admin.firestore.FieldValue.serverTimestamp(),
            });

            if (previousSaveCount < MAX_SAVE_COUNT) {
              t.set(saveCountRef, {
                count: previousSaveCount + 1,
              }, { merge: true });
            }

            const birdVisitMetadatas = birdVisitUtils.getBirdVisitMetadatas(
              userId,
              saveId,
              gameDataJson,
            );
            birdVisitMetadatas.forEach((birdVisitMetadata) => {
              const newBirdVisitMetadataRef = db.collection("birdVisitMetadata").doc();
              t.create(newBirdVisitMetadataRef, birdVisitMetadata);
            });

            return;
          });
      });
    });
});
