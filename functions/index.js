const functions = require("firebase-functions");
const admin = require("firebase-admin");
admin.initializeApp();

const cors = require("cors")({
  origin: true,
});

exports.saveCloudSave = require("./endpoints/saveCloudSave");

