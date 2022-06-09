
const functions = require("firebase-functions");
const admin = require("firebase-admin");

module.exports = functions.pubsub.schedule("every 24 hours").onRun(async (context) => {
  const db = admin.firestore();
  const now = admin.firestore.Timestamp.now();
  const ts = admin.firestore.Timestamp.fromMillis(now.toMillis() - 86400000);
  // 24 hours in milliseconds = 86400000

  const snap = await db.collection("birdVisitMetadata").where("validUntil", "<", ts).get();
  const promises = [];
  snap.forEach((snap) => {
    promises.push(snap.ref.delete());
  });
  return Promise.all(promises);
});
