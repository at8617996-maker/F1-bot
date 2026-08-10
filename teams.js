// teams.js
// Real F1 constructor names (factual, used as flavor/context data — same
// convention as any fantasy sports app). Junior categories (F2/F3/F4) use
// procedurally generated fictional prospects rather than claiming to
// represent real people, since we can't verify live junior rosters and
// won't misattribute identities.

const REAL_TEAMS = [
  { id: 'redbull', name: 'Red Bull Racing', color: 0x1E41FF },
  { id: 'ferrari', name: 'Scuderia Ferrari', color: 0xE8002D },
  { id: 'mercedes', name: 'Mercedes-AMG', color: 0x00D2BE },
  { id: 'mclaren', name: 'McLaren', color: 0xFF8700 },
  { id: 'astonmartin', name: 'Aston Martin', color: 0x006F62 },
  { id: 'alpine', name: 'Alpine', color: 0x0090FF },
  { id: 'williams', name: 'Williams', color: 0x005AFF },
  { id: 'rb', name: 'Racing Bulls', color: 0x6692FF },
  { id: 'sauber', name: 'Kick Sauber', color: 0x52E252 },
  { id: 'haas', name: 'Haas F1 Team', color: 0xB6BABD }
];

// Maps driver pool IDs (from drivers.js) to a real current constructor
// for market-listing flavor/grouping only.
const DRIVER_TEAM_MAP = {
  verstappen: 'redbull', lawson: 'redbull',
  hamilton: 'ferrari', leclerc: 'ferrari',
  russell: 'mercedes', antonelli: 'mercedes',
  norris: 'mclaren', piastri: 'mclaren',
  alonso: 'astonmartin', stroll: 'astonmartin',
  gasly: 'alpine', doohan: 'alpine', colapinto: 'alpine',
  albon: 'williams', sainz: 'williams',
  tsunoda: 'rb', hadjar: 'rb',
  hulkenberg: 'sauber', bortoleto: 'sauber',
  bearman: 'haas'
};

function getTeamForDriver(driverId) {
  const teamId = DRIVER_TEAM_MAP[driverId];
  return REAL_TEAMS.find(t => t.id === teamId) || null;
}

const JUNIOR_FIRST = ['Alex', 'Marco', 'Theo', 'Lukas', 'Dario', 'Felix', 'Ryo', 'Mateo', 'Owen', 'Enzo', 'Kian', 'Noah'];
const JUNIOR_LAST = ['Ferreira', 'Bianchi', 'Kowalski', 'Novak', 'Meier', 'Dubois', 'Castillo', 'Petrov', 'Larsen', 'Costa'];

function generateJuniorProspect(category) {
  const first = JUNIOR_FIRST[Math.floor(Math.random() * JUNIOR_FIRST.length)];
  const last = JUNIOR_LAST[Math.floor(Math.random() * JUNIOR_LAST.length)];
  const baseSkill = category === 'F2' ? [55, 75] : category === 'F3' ? [40, 60] : [25, 45];
  const skill = Math.round(baseSkill[0] + Math.random() * (baseSkill[1] - baseSkill[0]));
  return {
    id: `${category.toLowerCase()}_${first}_${last}_${Date.now()}`.toLowerCase(),
    name: `${first} ${last}`,
    category,
    skill,
    age: Math.round(15 + Math.random() * 8),
    potential: Math.round(50 + Math.random() * 49)
  };
}

module.exports = { REAL_TEAMS, DRIVER_TEAM_MAP, getTeamForDriver, generateJuniorProspect };
