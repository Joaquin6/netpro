module.exports = {
  bail: true,
  verbose: true,
  collectCoverage: true,
  coverageReporters: ['json', 'text', 'html'],
  collectCoverageFrom: ['index.js'],
  coverageThreshold: {
    global: {
      lines: 70,
      branches: 70,
      functions: 55,
      statements: 70,
    },
  },
};
