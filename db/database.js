// ── db/database.js ──
// Uses NeDB — a pure JavaScript embedded database.
// No compilation needed, works on any OS with just Node.js.
// Data is stored in two plain text files in the /db folder.

const Datastore = require('nedb-promises');
const path      = require('path');

// Users database — one record per registered account
const users = Datastore.create({
  filename: path.join(__dirname, 'users.db'),
  autoload: true  // Loads the file automatically on startup
});

// Decks database — one record per flashcard deck
const decks = Datastore.create({
  filename: path.join(__dirname, 'decks.db'),
  autoload: true
});

// Ensure email and google_id are indexed for fast lookups
users.ensureIndex({ fieldName: 'email',     unique: true, sparse: true });
users.ensureIndex({ fieldName: 'google_id', unique: true, sparse: true });

module.exports = { users, decks };
