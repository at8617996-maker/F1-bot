// database.js
// Simple JSON-file persistence layer. Works out of the box on Railway
// (no external DB service needed). Data is stored in data.json in the
// project root and re-written on every save.

const fs = require('fs');
const path = require('path');

const DB_PATH = path.join(__dirname, 'data.json');

function loadDB() {
  if (!fs.existsSync(DB_PATH)) {
    const initial = { teams: {}, season: 1, race: 1, calendar: buildCalendar() };
    fs.writeFileSync(DB_PATH, JSON.stringify(initial, null, 2));
    return initial;
  }
  return JSON.parse(fs.readFileSync(DB_PATH, 'utf8'));
}

function saveDB(db) {
  fs.writeFileSync(DB_PATH, JSON.stringify(db, null, 2));
}

function buildCalendar() {
  return [
    'Bahrain', 'Saudi Arabia', 'Australia', 'Japan', 'China',
    'Miami', 'Emilia Romagna', 'Monaco', 'Canada', 'Spain',
    'Austria', 'Great Britain', 'Hungary', 'Belgium', 'Netherlands',
    'Italy', 'Azerbaijan', 'Singapore', 'USA (Austin)', 'Mexico',
    'Brazil', 'Las Vegas', 'Qatar', 'Abu Dhabi'
  ];
}

// ---- Team helpers ----

function getTeam(db, userId) {
  return db.teams[userId] || null;
}

function createTeam(db, userId, teamName) {
  db.teams[userId] = {
    name: teamName,
    owner: userId,
    budget: 50_000_000,
    reputation: 50,
    facilities: {
      windTunnel: 1,
      factory: 1,
      simulator: 1,
      academy: 1
    },
    car: {
      aero: 50,
      engine: 50,
      chassis: 50,
      reliability: 70
    },
    staff: {
      principal: 'Generic Team Principal',
      technicalDirector: 'Generic Technical Director',
      pitCrewSkill: 50
    },
    drivers: [
      { name: 'Driver One', skill: 60, morale: 70, age: 24, contractYears: 2, wins: 0, podiums: 0, points: 0 },
      { name: 'Driver Two', skill: 55, morale: 70, age: 22, contractYears: 2, wins: 0, podiums: 0, points: 0 }
    ],
    juniors: [],
    sponsors: [],
    trophyCabinet: [],
    history: [],
    standingsPoints: 0,
    engineSupplier: 'Generic Power Unit Co.',
    lastRaceResult: null
  };
  saveDB(db);
  return db.teams[userId];
}

function saveTeam(db, userId, teamData) {
  db.teams[userId] = teamData;
  saveDB(db);
}

function getLeaderboard(db) {
  return Object.values(db.teams)
    .sort((a, b) => b.standingsPoints - a.standingsPoints);
}

module.exports = {
  loadDB,
  saveDB,
  getTeam,
  createTeam,
  saveTeam,
  getLeaderboard,
  buildCalendar
};
