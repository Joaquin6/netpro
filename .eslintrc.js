module.exports = {
  env: {
    node: true,
  },
  extends: [
    'airbnb-base',
    'plugin:node/recommended',
    'plugin:security/recommended',
  ],
  parserOptions: {
    ecmaVersion: 2019,
    sourceType: 'module',
  },
  plugins: [
    'node',
    'security',
  ],
  rules: {
    'arrow-parens': ['off'],
    curly: ['error', 'all'],
    indent: ['error', 2, {
      MemberExpression: 1,
      SwitchCase: 1,
    }],
    'no-bitwise': 'off',
    'no-mixed-operators': 'off',
    'no-param-reassign': ['error', { props: false }],
    'no-plusplus': 'off',
    'object-curly-newline': ['error', { consistent: true }],
    'security/detect-object-injection': 'off',
    'security/detect-unsafe-regex': 'off'
  },
};
