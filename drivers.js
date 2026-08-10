// drivers.js
// Real F1 grid driver names used as flavor data for the free-agent driver
// market. Skill/age numbers are gameplay ratings assigned for balance, not
// official statistics.

const DRIVER_POOL = [
  { id: 'verstappen', name: 'Max Verstappen', skill: 97, age: 28, price: 45_000_000 },
  { id: 'hamilton', name: 'Lewis Hamilton', skill: 93, age: 41, price: 32_000_000 },
  { id: 'leclerc', name: 'Charles Leclerc', skill: 92, age: 28, price: 35_000_000 },
  { id: 'norris', name: 'Lando Norris', skill: 93, age: 26, price: 38_000_000 },
  { id: 'piastri', name: 'Oscar Piastri', skill: 90, age: 25, price: 30_000_000 },
  { id: 'russell', name: 'George Russell', skill: 89, age: 28, price: 28_000_000 },
  { id: 'antonelli', name: 'Kimi Antonelli', skill: 82, age: 20, price: 15_000_000 },
  { id: 'alonso', name: 'Fernando Alonso', skill: 88, age: 45, price: 20_000_000 },
  { id: 'stroll', name: 'Lance Stroll', skill: 74, age: 27, price: 10_000_000 },
  { id: 'gasly', name: 'Pierre Gasly', skill: 83, age: 30, price: 16_000_000 },
  { id: 'doohan', name: 'Jack Doohan', skill: 76, age: 23, price: 8_000_000 },
  { id: 'tsunoda', name: 'Yuki Tsunoda', skill: 81, age: 26, price: 12_000_000 },
  { id: 'hadjar', name: 'Isack Hadjar', skill: 78, age: 21, price: 9_000_000 },
  { id: 'hulkenberg', name: 'Nico Hulkenberg', skill: 80, age: 38, price: 11_000_000 },
  { id: 'bortoleto', name: 'Gabriel Bortoleto', skill: 77, age: 21, price: 8_500_000 },
  { id: 'albon', name: 'Alexander Albon', skill: 84, age: 29, price: 17_000_000 },
  { id: 'sainz', name: 'Carlos Sainz', skill: 87, age: 31, price: 22_000_000 },
  { id: 'bearman', name: 'Oliver Bearman', skill: 79, age: 21, price: 9_500_000 },
  { id: 'colapinto', name: 'Franco Colapinto', skill: 78, age: 23, price: 9_000_000 },
  { id: 'lawson', name: 'Liam Lawson', skill: 79, age: 24, price: 9_500_000 }
];

function getFreeAgents(db) {
  const signed = new Set();
  for (const team of Object.values(db.teams)) {
    for (const d of team.drivers) if (d.poolId) signed.add(d.poolId);
  }
  return DRIVER_POOL.filter(d => !signed.has(d.id));
}

function findById(id) {
  return DRIVER_POOL.find(d => d.id === id) || null;
}

module.exports = { DRIVER_POOL, getFreeAgents, findById };
