module.exports = {
  extends: [
    '../.eslintrc.js',
    'plugin:jest/recommended',
  ],
  plugins: [
    'jest',
  ],
  env: {
    es6: true,
    jest: true,
    node: true,
  },
  rules: {
    'no-underscore-dangle': 'off',
    'no-unused-expressions': 'error',
  },
};
