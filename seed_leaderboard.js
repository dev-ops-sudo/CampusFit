// Seed script for gym leaderboard dataset
// Run once with: node seed_leaderboard.js

const path = require('path');
const Database = require('better-sqlite3');

const db = new Database(path.join(__dirname, 'users.db'));

function randBetween(min, max) {
  return Math.random() * (max - min) + min;
}

function randInt(min, max) {
  return Math.floor(randBetween(min, max + 1));
}

const firstNames = [
  'Aarav','Ishaan','Vivaan','Arjun','Reyansh','Aditya','Krishna','Devansh','Rohan','Kabir',
  'Ananya','Diya','Ishika','Aarohi','Kiara','Saanvi','Riya','Meera','Tara','Navya'
];

const lastNames = [
  'Sharma','Verma','Gupta','Patel','Singh','Mehta','Kapoor','Reddy','Nair','Mishra'
];

const exercises = ['Bench Press','Squat','Deadlift','Pullups','Overhead Press','Row','Running'];
const timeSlots = ['Morning','Afternoon','Evening','Night'];

function randomName() {
  const first = firstNames[randInt(0, firstNames.length - 1)];
  const last = lastNames[randInt(0, lastNames.length - 1)];
  return `${first} ${last}`;
}

function randomGender() {
  return Math.random() < 0.5 ? 'Male' : 'Female';
}

function randomExperience() {
  const r = Math.random();
  if (r < 0.4) return 'Beginner';
  if (r < 0.8) return 'Intermediate';
  return 'Advanced';
}

function randomWeight(gender, exp) {
  let base = gender === 'Male' ? 70 : 60;
  if (exp === 'Advanced') base += 5;
  if (exp === 'Beginner') base -= 3;
  return randBetween(base - 8, base + 8);
}

function prRanges(exp) {
  if (exp === 'Beginner') {
    return { bench: [30, 60], squat: [50, 90], deadlift: [60, 110] };
  }
  if (exp === 'Intermediate') {
    return { bench: [60, 100], squat: [90, 150], deadlift: [110, 180] };
  }
  return { bench: [100, 150], squat: [150, 220], deadlift: [180, 260] };
}

db.exec('PRAGMA foreign_keys = ON;');

db.transaction(() => {
  db.exec(`
    DELETE FROM gm_attendance;
    DELETE FROM gm_workout_records;
    DELETE FROM gm_personal_records;
    DELETE FROM gm_skill_rating;
    DELETE FROM gm_competitions;
    DELETE FROM gm_leaderboard_metrics;
    DELETE FROM gm_users;
  `);

  const insertUser = db.prepare(`
    INSERT INTO gm_users (user_id, name, age, gender, weight, experience_level, join_date)
    VALUES (?, ?, ?, ?, ?, ?, ?)
  `);

  const insertAttendance = db.prepare(`
    INSERT INTO gm_attendance (user_id, date, time_slot)
    VALUES (?, ?, ?)
  `);

  const insertWorkout = db.prepare(`
    INSERT INTO gm_workout_records (user_id, exercise_name, weight_lifted, reps, date)
    VALUES (?, ?, ?, ?, ?)
  `);

  const insertPR = db.prepare(`
    INSERT INTO gm_personal_records (user_id, bench_press_pr, squat_pr, deadlift_pr, pullups_max, running_time_1km)
    VALUES (?, ?, ?, ?, ?, ?)
  `);

  const insertSkill = db.prepare(`
    INSERT INTO gm_skill_rating (user_id, exercise, skill_score)
    VALUES (?, ?, ?)
  `);

  const insertCompetition = db.prepare(`
    INSERT INTO gm_competitions (user_id, event_name, rank, points)
    VALUES (?, ?, ?, ?)
  `);

  const today = new Date();
  const totalDays = 60;

  for (let id = 1; id <= 100; id++) {
    const name = randomName();
    const gender = randomGender();
    const experience = randomExperience();
    const age = randInt(18, 45);
    const weight = Number(randomWeight(gender, experience).toFixed(1));
    const joinOffset = randInt(0, 180);
    const joinDate = new Date(today.getTime() - joinOffset * 24 * 60 * 60 * 1000);
    insertUser.run(
      id,
      name,
      age,
      gender,
      weight,
      experience,
      joinDate.toISOString().slice(0, 10)
    );

    const attendanceProbability =
      experience === 'Advanced' ? 0.8 : experience === 'Intermediate' ? 0.6 : 0.4;

    for (let d = 0; d < totalDays; d++) {
      if (Math.random() < attendanceProbability) {
        const day = new Date(today.getTime() - d * 24 * 60 * 60 * 1000);
        const dateStr = day.toISOString().slice(0, 10);
        const slot = timeSlots[randInt(0, timeSlots.length - 1)];
        insertAttendance.run(id, dateStr, slot);
      }
    }

    const [minBench, maxBench] = prRanges(experience).bench;
    const [minSquat, maxSquat] = prRanges(experience).squat;
    const [minDead, maxDead] = prRanges(experience).deadlift;
    const bench = Number(randBetween(minBench, maxBench).toFixed(1));
    const squat = Number(randBetween(minSquat, maxSquat).toFixed(1));
    const dead = Number(randBetween(minDead, maxDead).toFixed(1));
    const pullups = randInt(
      experience === 'Beginner' ? 2 : 6,
      experience === 'Advanced' ? 20 : 12
    );
    const runTime =
      experience === 'Advanced'
        ? randBetween(3.5, 4.5)
        : experience === 'Intermediate'
        ? randBetween(4.5, 5.5)
        : randBetween(5.5, 7.0);

    insertPR.run(id, bench, squat, dead, pullups, Number(runTime.toFixed(2)));

    const workoutCount = randInt(5, 8);
    for (let w = 0; w < workoutCount; w++) {
      const ex = exercises[randInt(0, exercises.length - 1)];
      const weightFactor =
        ex === 'Bench Press'
          ? bench
          : ex === 'Squat'
          ? squat
          : ex === 'Deadlift'
          ? dead
          : weight * randBetween(0.2, 0.7);
      const wl = Number((weightFactor * randBetween(0.6, 1.0)).toFixed(1));
      const reps = randInt(3, 12);
      const dayOffset = randInt(0, totalDays - 1);
      const day = new Date(today.getTime() - dayOffset * 24 * 60 * 60 * 1000);
      const dateStr = day.toISOString().slice(0, 10);
      insertWorkout.run(id, ex, wl, reps, dateStr);
    }

    const skillExercises = [...exercises].sort(() => Math.random() - 0.5).slice(0, randInt(4, 6));
    skillExercises.forEach((ex) => {
      let base;
      if (experience === 'Beginner') base = randBetween(4, 7);
      else if (experience === 'Intermediate') base = randBetween(6, 9);
      else base = randBetween(7.5, 10);
      const score = Math.min(10, Math.max(1, Math.round(base + randBetween(-1, 1))));
      insertSkill.run(id, ex, score);
    });

    if (Math.random() < 0.35) {
      const events = ['Bench Showdown', 'Squat Challenge', 'Deadlift Derby', 'Campus Games'];
      const eventCount = randInt(1, 3);
      for (let e = 0; e < eventCount; e++) {
        const ev = events[randInt(0, events.length - 1)];
        const rank = randInt(1, 10);
        let points;
        if (rank === 1) points = 25;
        else if (rank === 2) points = 18;
        else if (rank === 3) points = 15;
        else if (rank <= 5) points = 10;
        else if (rank <= 8) points = 6;
        else points = 3;
        insertCompetition.run(id, ev, rank, points);
      }
    }
  }

  const insertMetrics = db.prepare(`
    INSERT INTO gm_leaderboard_metrics
      (user_id, strength_score, consistency_score, improvement_score, skill_score, competition_points, total_score)
    VALUES (?, ?, ?, ?, ?, ?, ?)
  `);

  const users = db.prepare(`
    SELECT u.user_id, u.weight, pr.bench_press_pr, pr.squat_pr, pr.deadlift_pr
    FROM gm_users u
    JOIN gm_personal_records pr ON pr.user_id = u.user_id
  `).all();

  const attendanceStats = db
    .prepare(`SELECT user_id, COUNT(DISTINCT date) AS days FROM gm_attendance GROUP BY user_id`)
    .all()
    .reduce((acc, row) => {
      acc[row.user_id] = row.days;
      return acc;
    }, {});

  const skillStats = db
    .prepare(`SELECT user_id, AVG(skill_score) AS avg_skill FROM gm_skill_rating GROUP BY user_id`)
    .all()
    .reduce((acc, row) => {
      acc[row.user_id] = row.avg_skill;
      return acc;
    }, {});

  const compStats = db
    .prepare(`SELECT user_id, SUM(points) AS pts FROM gm_competitions GROUP BY user_id`)
    .all()
    .reduce((acc, row) => {
      acc[row.user_id] = row.pts;
      return acc;
    }, {});

  const totalDaysForMetrics = 60;

  for (const u of users) {
    const attendanceDays = attendanceStats[u.user_id] || 0;
    const avgSkill = skillStats[u.user_id] || 0;
    const compPoints = compStats[u.user_id] || 0;

    const strengthScore =
      (u.bench_press_pr + u.squat_pr + u.deadlift_pr) / (u.weight || 1);

    const consistencyScore = (attendanceDays / totalDaysForMetrics) * 100;

    const previousFactor = randBetween(0.7, 0.95);
    const currentPRSum = u.bench_press_pr + u.squat_pr + u.deadlift_pr;
    const previousPRSum = currentPRSum * previousFactor;
    const improvementScore =
      ((currentPRSum - previousPRSum) / previousPRSum) * 100;

    const skillScore = avgSkill;
    const competitionPoints = compPoints;

    const totalScore =
      0.35 * strengthScore +
      0.25 * consistencyScore +
      0.2 * improvementScore +
      0.1 * skillScore +
      0.1 * competitionPoints;

    insertMetrics.run(
      u.user_id,
      Number(strengthScore.toFixed(2)),
      Number(consistencyScore.toFixed(2)),
      Number(improvementScore.toFixed(2)),
      Number(skillScore.toFixed(2)),
      Number(competitionPoints.toFixed(2)),
      Number(totalScore.toFixed(2))
    );
  }
})();

console.log('Gym leaderboard data seeded successfully.');

