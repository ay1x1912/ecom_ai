/**
 * Forces every test run onto the test database, whatever the shell environment
 * says. config/database.js appends _test when NODE_ENV=test, so this single line
 * is what stops a stray `npm test` from truncating development data.
 */
process.env.NODE_ENV = 'test';
