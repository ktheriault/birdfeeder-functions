const functions = require("firebase-functions");
const admin = require("firebase-admin");
admin.initializeApp();

const cors = require("cors")({
  origin: true,
});

exports.setUsername = require("./endpoints/profiles/setUsername");

exports.saveCloudSave = require("./endpoints/saves/saveCloudSave");
exports.loadCloudSave = require("./endpoints/saves/loadCloudSave");
exports.getRandomFarmList = require("./endpoints/saves/getRandomFarmList");
exports.cleanUpDatabase = require("./endpoints/saves/cleanUpDatabase");

exports.addFavorite = require("./endpoints/favorites/addFavorite");
exports.getCanAddFavorite = require("./endpoints/favorites/getCanAddFavorite");
exports.getCanAddFavorites = require("./endpoints/favorites/getCanAddFavorites");
exports.getFavoritedCount = require("./endpoints/favorites/getFavoritedCount");
exports.getFavoritesList = require("./endpoints/favorites/getFavoritesList");
exports.removeFavorite = require("./endpoints/favorites/removeFavorite");

exports.acceptFriendRequest = require("./endpoints/friends/acceptFriendRequest");
exports.blockUser = require("./endpoints/friends/blockUser");
exports.cancelFriendRequest = require("./endpoints/friends/cancelFriendRequest");
exports.declineFriendRequest = require("./endpoints/friends/declineFriendRequest");
exports.getCanAddFriend = require("./endpoints/friends/getCanAddFriend");
exports.getCanAddFriends = require("./endpoints/friends/getCanAddFriends");
exports.getFriendsList = require("./endpoints/friends/getFriendsList");
exports.getIncomingFriendRequests = require("./endpoints/friends/getIncomingFriendRequests");
exports.getOutgoingFriendRequests = require("./endpoints/friends/getOutgoingFriendRequests");
exports.removeFriend = require("./endpoints/friends/removeFriend");
exports.sendFriendRequest = require("./endpoints/friends/sendFriendRequest");
exports.unblockUser = require("./endpoints/friends/unblockUser");
