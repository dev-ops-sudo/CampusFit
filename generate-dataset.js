const Database = require('better-sqlite3');
const bcrypt = require('bcryptjs');
const path = require('path');
const { faker } = require('@faker-js/faker');

const dbPath = path.join(__dirname, 'users.db');
const db = new Database(dbPath);

console.log('Starting dataset generation...');

// Start a transaction for bulk inserting
const insertTransaction = db.transaction(() => {
  const insertUser = db.prepare('INSERT INTO users (email, password_hash) VALUES (?, ?)');
  const insertProfile = db.prepare(`
    INSERT INTO profiles (user_id, avatar, about, full_name, benchpress_pr, dumbbell_pr, progress_notes, my_timeslot, leaderboard_position)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);

  for (let i = 0; i < 100; i++) {
    // Generate User Data
    const firstName = faker.person.firstName();
    const lastName = faker.person.lastName();
    const email = faker.internet.email({ firstName, lastName }).toLowerCase();
    const password = 'password123'; // Default password for dummy users
    const passwordHash = bcrypt.hashSync(password, 10);
    
    // Insert User
    const userResult = insertUser.run(email, passwordHash);
    const userId = userResult.lastInsertRowid;

    // Generate Profile Data
    const fullName = `${firstName} ${lastName}`;
    const avatar = faker.image.avatar();
    const about = faker.lorem.sentence();
    
    // Generate realistic gym stats
    const benchPR = faker.number.int({ min: 40, max: 140 }) + 'kg';
    const dumbbellPR = faker.number.int({ min: 10, max: 40 }) + 'kg';
    const progressNotes = faker.lorem.paragraph();
    
    const timeslots = ['Morning (6AM - 10AM)', 'Afternoon (12PM - 4PM)', 'Evening (5PM - 9PM)', 'Night (9PM - 12AM)'];
    const myTimeslot = faker.helpers.arrayElement(timeslots);
    const leaderboardPosition = faker.number.int({ min: 1, max: 500 }); // Random position

    // Insert Profile
    try {
        insertProfile.run(
        userId,
        avatar,
        about,
        fullName,
        benchPR,
        dumbbellPR,
        progressNotes,
        myTimeslot,
        leaderboardPosition
        );
    } catch(err) {
        console.error(`Failed to insert profile for user ${userId}`, err);
    }
  }
});

try {
  insertTransaction();
  console.log('Successfully generated 100 dummy users with profiles!');
} catch (error) {
  console.error('Error generating dataset:', error);
}

db.close();
