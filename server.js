// ── server.js ── PurplStudy Backend
// Handles: serving HTML pages, user authentication, and deck API

require('dotenv').config();

const express        = require('express');
const session        = require('express-session');
const passport       = require('passport');
const GoogleStrategy = require('passport-google-oauth20').Strategy;
const LocalStrategy  = require('passport-local').Strategy;
const bcrypt         = require('bcryptjs');  // Pure JS — no compilation needed
const path           = require('path');
const { users, decks } = require('./db/database');

const app  = express();
const PORT = process.env.PORT || 3000;

// ── MIDDLEWARE ──
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// ── SESSION ──
// Simple in-memory session store — sessions reset on server restart.
// Fine for a home server. (Can upgrade to file-based later if needed.)
app.use(session({
  secret: process.env.SESSION_SECRET,
  resave: false,
  saveUninitialized: false,
  cookie: { maxAge: 1000 * 60 * 60 * 24 * 30 } // 30 days
}));

app.use(passport.initialize());
app.use(passport.session());

// Serialize: store just the user's _id in the session cookie
passport.serializeUser((user, done) => done(null, user._id));

// Deserialize: look up the full user record from the session _id
passport.deserializeUser(async (id, done) => {
  try {
    const user = await users.findOne({ _id: id });
    done(null, user || false);
  } catch(e) { done(e); }
});

// ── GOOGLE OAUTH ──
passport.use(new GoogleStrategy({
  clientID:     process.env.GOOGLE_CLIENT_ID,
  clientSecret: process.env.GOOGLE_CLIENT_SECRET,
  callbackURL:  `${process.env.BASE_URL}/auth/google/callback`
}, async (accessToken, refreshToken, profile, done) => {
  try {
    // Check if this Google account already exists
    let user = await users.findOne({ google_id: profile.id });

    if (!user) {
      // New Google user — create their account
      user = await users.insert({
        google_id: profile.id,
        email:     profile.emails[0].value,
        name:      profile.displayName,
        created_at: new Date()
      });
    }
    done(null, user);
  } catch(e) { done(e); }
}));

// ── EMAIL/PASSWORD AUTH ──
passport.use(new LocalStrategy({ usernameField: 'email' }, async (email, password, done) => {
  try {
    const user = await users.findOne({ email });
    if (!user)              return done(null, false, { message: 'No account found with that email.' });
    if (!user.password_hash) return done(null, false, { message: 'This account uses Google sign-in.' });

    const match = await bcrypt.compare(password, user.password_hash);
    if (!match) return done(null, false, { message: 'Incorrect password.' });

    done(null, user);
  } catch(e) { done(e); }
}));

// ── STATIC FILES ──
app.use(express.static(path.join(__dirname, 'public')));


// ════════════════════════════════════════
// AUTH ROUTES
// ════════════════════════════════════════

// Start Google login
app.get('/auth/google',
  passport.authenticate('google', { scope: ['profile', 'email'] })
);

// Google callback
app.get('/auth/google/callback',
  passport.authenticate('google', { failureRedirect: '/login.html?error=google' }),
  (req, res) => res.redirect('/')
);

// Email/password login
app.post('/auth/login', (req, res, next) => {
  passport.authenticate('local', (err, user, info) => {
    if (err)   return next(err);
    if (!user) return res.json({ success: false, message: info.message });
    req.logIn(user, err => {
      if (err) return next(err);
      res.json({ success: true });
    });
  })(req, res, next);
});

// Register new account
app.post('/auth/register', async (req, res) => {
  const { email, password, name } = req.body;

  if (!email || !password || !name)
    return res.json({ success: false, message: 'All fields are required.' });
  if (password.length < 6)
    return res.json({ success: false, message: 'Password must be at least 6 characters.' });

  try {
    const existing = await users.findOne({ email });
    if (existing)
      return res.json({ success: false, message: 'An account with that email already exists.' });

    const hash = await bcrypt.hash(password, 12);
    const user = await users.insert({ email, password_hash: hash, name, created_at: new Date() });

    req.logIn(user, err => {
      if (err) return res.json({ success: false, message: 'Registration failed.' });
      res.json({ success: true });
    });
  } catch(e) {
    res.json({ success: false, message: 'Registration failed.' });
  }
});

// Logout
app.post('/auth/logout', (req, res) => {
  req.logout(() => res.json({ success: true }));
});

// Who is logged in?
app.get('/auth/me', (req, res) => {
  if (req.isAuthenticated()) {
    res.json({ loggedIn: true, user: { id: req.user._id, name: req.user.name, email: req.user.email } });
  } else {
    res.json({ loggedIn: false });
  }
});


// ════════════════════════════════════════
// DECKS API
// ════════════════════════════════════════

function requireAuth(req, res, next) {
  if (req.isAuthenticated()) return next();
  res.status(401).json({ error: 'Not logged in' });
}

// Get all decks for the logged-in user
app.get('/api/decks', requireAuth, async (req, res) => {
  const all = await decks.find({ user_id: req.user._id });
  res.json(all);
});

// Create a new deck
app.post('/api/decks', requireAuth, async (req, res) => {
  const { id, name, cards } = req.body;
  await decks.insert({ _id: id, user_id: req.user._id, name, cards, created_at: new Date() });
  res.json({ success: true });
});

// Update a deck
app.put('/api/decks/:id', requireAuth, async (req, res) => {
  const { name, cards } = req.body;
  await decks.update({ _id: req.params.id, user_id: req.user._id }, { $set: { name, cards } });
  res.json({ success: true });
});

// Delete a deck
app.delete('/api/decks/:id', requireAuth, async (req, res) => {
  await decks.remove({ _id: req.params.id, user_id: req.user._id });
  res.json({ success: true });
});


// ── START ──
app.listen(PORT, () => {
  console.log(`✦ PurplStudy running at http://localhost:${PORT}`);
});
