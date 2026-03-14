require('dotenv').config();
const express = require('express');
const cors = require('cors');
const path = require('path');
const Database = require('better-sqlite3');
const bcrypt = require('bcryptjs');
const crypto = require('crypto');
const jwt = require('jsonwebtoken');
const nodemailer = require('nodemailer');

const app = express();
const PORT = process.env.PORT || 3000;
const JWT_SECRET = process.env.JWT_SECRET || 'bennett-university-secret-change-in-production';
const FRONTEND_URL = process.env.FRONTEND_URL || `http://localhost:${PORT}`;

// Middleware
app.use(cors());
app.use(express.json({ limit: '10mb' }));
app.use(express.static(__dirname));

// Database setup
const db = new Database(path.join(__dirname, 'users.db'));

db.exec(`
  CREATE TABLE IF NOT EXISTS users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    email TEXT UNIQUE NOT NULL,
    password_hash TEXT NOT NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
  );

  CREATE TABLE IF NOT EXISTS password_reset_tokens (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER NOT NULL,
    token TEXT NOT NULL UNIQUE,
    expires_at DATETIME NOT NULL,
    used INTEGER DEFAULT 0,
    FOREIGN KEY (user_id) REFERENCES users(id)
  );

  CREATE INDEX IF NOT EXISTS idx_reset_token ON password_reset_tokens(token);
  CREATE INDEX IF NOT EXISTS idx_reset_expires ON password_reset_tokens(expires_at);

  CREATE TABLE IF NOT EXISTS profiles (
    user_id INTEGER PRIMARY KEY,
    avatar TEXT,
    about TEXT,
    full_name TEXT,
    benchpress_pr TEXT,
    dumbbell_pr TEXT,
    progress_notes TEXT,
    my_timeslot TEXT,
    leaderboard_position INTEGER DEFAULT 0,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id)
  );

  CREATE TABLE IF NOT EXISTS feedback (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    email TEXT NOT NULL,
    message TEXT NOT NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
  );

  -- Gym leaderboard schema (prefixed with gm_ to avoid conflicts)
  CREATE TABLE IF NOT EXISTS gm_users (
    user_id INTEGER PRIMARY KEY,
    name TEXT NOT NULL,
    age INTEGER,
    gender TEXT,
    weight REAL,
    experience_level TEXT CHECK (experience_level IN ('Beginner','Intermediate','Advanced')),
    join_date DATE
  );

  CREATE TABLE IF NOT EXISTS gm_attendance (
    attendance_id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER NOT NULL,
    date DATE NOT NULL,
    time_slot TEXT CHECK (time_slot IN ('Morning','Afternoon','Evening','Night')),
    FOREIGN KEY (user_id) REFERENCES gm_users(user_id)
  );

  CREATE TABLE IF NOT EXISTS gm_workout_records (
    record_id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER NOT NULL,
    exercise_name TEXT NOT NULL,
    weight_lifted REAL,
    reps INTEGER,
    date DATE NOT NULL,
    FOREIGN KEY (user_id) REFERENCES gm_users(user_id)
  );

  CREATE TABLE IF NOT EXISTS gm_personal_records (
    user_id INTEGER PRIMARY KEY,
    bench_press_pr REAL,
    squat_pr REAL,
    deadlift_pr REAL,
    pullups_max INTEGER,
    running_time_1km REAL,
    FOREIGN KEY (user_id) REFERENCES gm_users(user_id)
  );

  CREATE TABLE IF NOT EXISTS gm_skill_rating (
    user_id INTEGER NOT NULL,
    exercise TEXT NOT NULL,
    skill_score INTEGER CHECK (skill_score BETWEEN 1 AND 10),
    PRIMARY KEY (user_id, exercise),
    FOREIGN KEY (user_id) REFERENCES gm_users(user_id)
  );

  CREATE TABLE IF NOT EXISTS gm_competitions (
    competition_id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER NOT NULL,
    event_name TEXT NOT NULL,
    rank INTEGER,
    points REAL,
    FOREIGN KEY (user_id) REFERENCES gm_users(user_id)
  );

  CREATE TABLE IF NOT EXISTS gm_leaderboard_metrics (
    user_id INTEGER PRIMARY KEY,
    strength_score REAL,
    consistency_score REAL,
    improvement_score REAL,
    skill_score REAL,
    competition_points REAL,
    total_score REAL,
    FOREIGN KEY (user_id) REFERENCES gm_users(user_id)
  );
`);

function authMiddleware(req, res, next) {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ success: false, message: 'Unauthorized' });
  }
  try {
    const token = authHeader.slice(7);
    const decoded = jwt.verify(token, JWT_SECRET);
    req.userId = decoded.userId;
    next();
  } catch (err) {
    return res.status(401).json({ success: false, message: 'Invalid or expired token' });
  }
}

// Email transporter – configure via .env
let transporter = null;
if (process.env.SMTP_HOST) {
  transporter = nodemailer.createTransport({
    host: process.env.SMTP_HOST,
    port: parseInt(process.env.SMTP_PORT || '587', 10),
    secure: process.env.SMTP_SECURE === 'true',
    auth: {
      user: process.env.SMTP_USER,
      pass: process.env.SMTP_PASS,
    },
  });
}

function sendResetEmail(to, resetLink) {
  if (!transporter) {
    console.warn('Email not configured. Reset link:', resetLink);
    return Promise.resolve();
  }
  return transporter.sendMail({
    from: process.env.SMTP_FROM || process.env.SMTP_USER || 'noreply@bennett.edu',
    to,
    subject: 'Reset your password – Bennett University',
    html: `
      <p>You requested a password reset.</p>
      <p>Click the link below to set a new password (valid for 1 hour):</p>
      <p><a href="${resetLink}" style="color:#c9a227;font-weight:600">${resetLink}</a></p>
      <p>If you didn't request this, you can ignore this email.</p>
      <p>— Bennett University</p>
    `,
  });
}

// API: Signup
app.post('/api/signup', (req, res) => {
  try {
    const { email, password } = req.body;
    if (!email || !password) {
      return res.status(400).json({ success: false, message: 'Email and password required' });
    }
    if (password.length < 6) {
      return res.status(400).json({ success: false, message: 'Password must be at least 6 characters' });
    }

    const passwordHash = bcrypt.hashSync(password, 10);
    const stmt = db.prepare('INSERT INTO users (email, password_hash) VALUES (?, ?)');

    try {
      const emailNorm = email.toLowerCase().trim();
      stmt.run(emailNorm, passwordHash);
      const row = db.prepare('SELECT id, email FROM users WHERE email = ?').get(emailNorm);
      const token = jwt.sign({ userId: row.id }, JWT_SECRET, { expiresIn: '7d' });
      res.json({ success: true, message: 'Account created successfully', token, user: { id: row.id, email: row.email } });
    } catch (err) {
      if (err.message.includes('UNIQUE')) {
        return res.status(400).json({ success: false, message: 'Email already registered' });
      }
      throw err;
    }
  } catch (err) {
    console.error('Signup error:', err);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

// API: Login
app.post('/api/login', (req, res) => {
  try {
    const { email, password } = req.body;
    if (!email || !password) {
      return res.status(400).json({ success: false, message: 'Email and password required' });
    }

    const row = db.prepare('SELECT id, email, password_hash FROM users WHERE email = ?').get(email.toLowerCase().trim());
    if (!row) {
      return res.status(401).json({ success: false, message: 'Invalid email or password' });
    }

    const match = bcrypt.compareSync(password, row.password_hash);
    if (!match) {
      return res.status(401).json({ success: false, message: 'Invalid email or password' });
    }

    const token = jwt.sign({ userId: row.id }, JWT_SECRET, { expiresIn: '7d' });
    res.json({ success: true, message: 'Logged in successfully', token, user: { id: row.id, email: row.email } });
  } catch (err) {
    console.error('Login error:', err);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

// API: Forgot password – send reset email
app.post('/api/forgot-password', async (req, res) => {
  try {
    const { email } = req.body;
    if (!email) {
      return res.status(400).json({ success: false, message: 'Email required' });
    }

    const row = db.prepare('SELECT id FROM users WHERE email = ?').get(email.toLowerCase().trim());
    // Always return success to prevent email enumeration
    const successMessage = 'If that email is registered, you will receive a password reset link.';

    if (!row) {
      return res.json({ success: true, message: successMessage });
    }

    const token = crypto.randomBytes(32).toString('hex');
    const expiresAt = new Date(Date.now() + 60 * 60 * 1000).toISOString(); // 1 hour

    db.prepare('INSERT INTO password_reset_tokens (user_id, token, expires_at) VALUES (?, ?, ?)').run(row.id, token, expiresAt);

    const resetLink = `${FRONTEND_URL}/reset-password.html?token=${token}`;

    try {
      await sendResetEmail(email.toLowerCase().trim(), resetLink);
    } catch (mailErr) {
      console.error('Email send error:', mailErr);
      return res.status(500).json({ success: false, message: 'Failed to send email. Check server configuration.' });
    }

    res.json({ success: true, message: successMessage });
  } catch (err) {
    console.error('Forgot password error:', err);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

// API: Reset password – with valid token
app.post('/api/reset-password', (req, res) => {
  try {
    const { token, password } = req.body;
    if (!token || !password) {
      return res.status(400).json({ success: false, message: 'Token and new password required' });
    }
    if (password.length < 6) {
      return res.status(400).json({ success: false, message: 'Password must be at least 6 characters' });
    }

    const row = db.prepare(`
      SELECT prt.user_id FROM password_reset_tokens prt
      WHERE prt.token = ? AND prt.expires_at > datetime('now') AND prt.used = 0
    `).get(token);

    if (!row) {
      return res.status(400).json({ success: false, message: 'Invalid or expired reset link. Please request a new one.' });
    }

    const passwordHash = bcrypt.hashSync(password, 10);
    db.prepare('UPDATE users SET password_hash = ? WHERE id = ?').run(passwordHash, row.user_id);
    db.prepare('UPDATE password_reset_tokens SET used = 1 WHERE token = ?').run(token);

    res.json({ success: true, message: 'Password updated. You can now log in.' });
  } catch (err) {
    console.error('Reset password error:', err);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

// API: Get profile (requires auth)
app.get('/api/profile', authMiddleware, (req, res) => {
  try {
    const row = db.prepare('SELECT * FROM profiles WHERE user_id = ?').get(req.userId);
    const user = db.prepare('SELECT id, email FROM users WHERE id = ?').get(req.userId);
    res.json({ success: true, profile: row || null, user });
  } catch (err) {
    console.error('Get profile error:', err);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

// API: Save profile (requires auth)
app.post('/api/profile', authMiddleware, (req, res) => {
  try {
    const { avatar, about, full_name, benchpress_pr, dumbbell_pr, progress_notes, my_timeslot, leaderboard_position } = req.body;
    const userId = req.userId;
    const pos = leaderboard_position != null ? leaderboard_position : 0;

    const existing = db.prepare('SELECT user_id FROM profiles WHERE user_id = ?').get(userId);
    if (existing) {
      db.prepare(`
        UPDATE profiles SET avatar=?, about=?, full_name=?, benchpress_pr=?, dumbbell_pr=?, progress_notes=?, my_timeslot=?, leaderboard_position=?, updated_at=CURRENT_TIMESTAMP WHERE user_id=?
      `).run(avatar || null, about || null, full_name || null, benchpress_pr || null, dumbbell_pr || null, progress_notes || null, my_timeslot || null, pos, userId);
    } else {
      db.prepare(`
        INSERT INTO profiles (user_id, avatar, about, full_name, benchpress_pr, dumbbell_pr, progress_notes, my_timeslot, leaderboard_position)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
      `).run(userId, avatar || null, about || null, full_name || null, benchpress_pr || null, dumbbell_pr || null, progress_notes || null, my_timeslot || null, pos);
    }
    res.json({ success: true, message: 'Profile saved' });
  } catch (err) {
    console.error('Save profile error:', err);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

// API: Get leaderboard (all users and profiles)
app.get('/api/leaderboard', (req, res) => {
  try {
    const rows = db.prepare(`
      SELECT u.id, u.email, p.full_name, p.avatar, p.benchpress_pr, p.dumbbell_pr, p.leaderboard_position
      FROM users u
      LEFT JOIN profiles p ON u.id = p.user_id
      ORDER BY p.leaderboard_position ASC, u.id ASC
    `).all();
    res.json({ success: true, data: rows });
  } catch (err) {
    console.error('Get leaderboard error:', err);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

// API: Advanced leaderboard based on gm_* tables
app.get('/api/leaderboard-advanced', (req, res) => {
  try {
    const totalDays = 60; // matches seeding script

    const rows = db.prepare(`
      WITH attendance_stats AS (
        SELECT user_id, COUNT(DISTINCT date) AS attendance_days
        FROM gm_attendance
        GROUP BY user_id
      ),
      skill_stats AS (
        SELECT user_id, AVG(skill_score) AS avg_skill
        FROM gm_skill_rating
        GROUP BY user_id
      ),
      competition_stats AS (
        SELECT user_id, IFNULL(SUM(points), 0) AS total_points
        FROM gm_competitions
        GROUP BY user_id
      )
      SELECT
        u.user_id,
        u.name,
        u.experience_level,
        u.weight,
        pr.bench_press_pr,
        pr.squat_pr,
        pr.deadlift_pr,
        COALESCE(lm.strength_score,
          (pr.bench_press_pr + pr.squat_pr + pr.deadlift_pr) / NULLIF(u.weight, 0)
        ) AS strength_score,
        COALESCE(lm.consistency_score,
          (CAST(IFNULL(a.attendance_days,0) AS REAL) / ?) * 100.0
        ) AS consistency_score,
        lm.improvement_score,
        COALESCE(lm.skill_score, IFNULL(s.avg_skill,0)) AS skill_score,
        COALESCE(lm.competition_points, IFNULL(c.total_points,0)) AS competition_points,
        lm.total_score
      FROM gm_users u
      LEFT JOIN gm_personal_records pr ON pr.user_id = u.user_id
      LEFT JOIN gm_leaderboard_metrics lm ON lm.user_id = u.user_id
      LEFT JOIN attendance_stats a ON a.user_id = u.user_id
      LEFT JOIN skill_stats s ON s.user_id = u.user_id
      LEFT JOIN competition_stats c ON c.user_id = u.user_id
      ORDER BY lm.total_score DESC NULLS LAST, strength_score DESC
      LIMIT 50;
    `).all(totalDays);

    res.json({ success: true, data: rows });
  } catch (err) {
    console.error('Advanced leaderboard error:', err);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

// API: Submit feedback (contact form)
app.post('/api/feedback', (req, res) => {
  try {
    const { name, email, message } = req.body;
    if (!name || !email || !message) {
      return res.status(400).json({ success: false, message: 'Name, email, and message are required' });
    }
    const insert = db.prepare(
      'INSERT INTO feedback (name, email, message) VALUES (?, ?, ?)'
    );
    insert.run(String(name).trim(), String(email).trim(), String(message).trim());
    res.json({ success: true, message: 'Thanks for your feedback!' });
  } catch (err) {
    console.error('Feedback error:', err);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

// Serve HTML pages
app.get('/', (req, res) => res.sendFile(path.join(__dirname, 'index.html')));
app.get('/login', (req, res) => res.sendFile(path.join(__dirname, 'login.html')));
app.get('/signup', (req, res) => res.sendFile(path.join(__dirname, 'signup.html')));
app.get('/forgot-password', (req, res) => res.sendFile(path.join(__dirname, 'forgot-password.html')));
app.get('/reset-password', (req, res) => res.sendFile(path.join(__dirname, 'reset-password.html')));
app.get('/profile', (req, res) => res.sendFile(path.join(__dirname, 'profile.html')));

app.listen(PORT, () => {
  console.log(`Server running at http://localhost:${PORT}`);
  if (!transporter) {
    console.log('Note: Email not configured. Set SMTP_* in .env for forgot-password emails.');
  }
});
