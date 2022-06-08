module.exports = {
  root: true,
  env: {
    es6: true,
    node: true,
  },
  extends: [
    "eslint:recommended",
    "google",
  ],
  rules: {
    "quotes": ["error", "double"],
    "linebreak-style": 0,
    "no-unused-vars": 0,
    "arrow-parens": 0,
    "object-curly-spacing": ["error", "always"],
    "require-jsdoc": 0,
    "max-len": [2, 100, 2],
  },
};
