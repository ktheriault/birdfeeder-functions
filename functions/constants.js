exports.MAX_SAVE_COUNT = 5;
exports.START_MAX_FAVORITE_COUNT = 10;
exports.END_MAX_FAVORITE_COUNT = 50;
exports.START_MAX_FRIEND_COUNT = 10;
exports.END_MAX_FRIEND_COUNT = 50;

exports.MAX_FAVORITES_LIMIT = 10;
exports.MAX_FRIENDS_LIMIT = 10;
exports.MAX_RANDOM_FARMS_LIMIT = 10;

exports.PUBLIC_SAVE_DATA_KEYS = {
  "SavedInventoryData": false,
  "SavedLocationData": true,
  "SavedLocationSlotData": true,
  "SavedFeederData": true,
  "SavedFoodData": false, // not necessary
  "SavedBirdData": false, // large, not necessary, your names and stuff will be private
  // not necessary unless skills boost how much gold other people give when they visit your farm
  "SavedSkillSetData": false,
  "SavedSkinData": true,
  "SavedTutorialData": false, // not necessary
  "SavedShopData": false,
  "SavedGuideData": false,
  "SavedBirdVisits": true,
};

