// gameEngine.js
// Core simulation logic. Each exported function maps to one or more of the
// 50 F1 Manager 2025-inspired features listed at the bottom of this file.

function clamp(n, min, max) { return Math.max(min, Math.min(max, n)); }
function rand(min, max) { return Math.random() * (max - min) + min; }
function chance(pct) { return Math.random() * 100 < pct; }

// ---- 1-5: Car development ----
function upgradeCarPart(team, part, amount, cost) {
  if (team.budget < cost) return { ok: false, msg: 'Not enough budget.' };
  team.budget -= cost;
  team.car[part] = clamp(team.car[part] + amount, 0, 100);
  return { ok: true, msg: `${part} upgraded to ${team.car[part]}.` };
}

function windTunnelResearch(team) {
  const cost = 2_000_000 * team.facilities.windTunnel;
  if (team.budget < cost) return { ok: false, msg: 'Not enough budget for wind tunnel research.' };
  team.budget -= cost;
  const gain = Math.round(rand(1, 4) * (team.facilities.windTunnel / 2));
  team.car.aero = clamp(team.car.aero + gain, 0, 100);
  return { ok: true, msg: `Wind tunnel research complete. Aero +${gain}.` };
}

function reliabilityProgram(team, cost) {
  if (team.budget < cost) return { ok: false, msg: 'Not enough budget.' };
  team.budget -= cost;
  const gain = Math.round(rand(1, 3));
  team.car.reliability = clamp(team.car.reliability + gain, 0, 100);
  return { ok: true, msg: `Reliability program complete. Reliability +${gain}.` };
}

// ---- 6-10: Facilities ----
function upgradeFacility(team, facility, cost) {
  if (team.budget < cost) return { ok: false, msg: 'Not enough budget.' };
  if (team.facilities[facility] >= 5) return { ok: false, msg: 'Facility already maxed out.' };
  team.budget -= cost;
  team.facilities[facility] += 1;
  return { ok: true, msg: `${facility} upgraded to level ${team.facilities[facility]}.` };
}

// ---- 11-15: Staff & drivers ----
function hirePitCrew(team, cost) {
  if (team.budget < cost) return { ok: false, msg: 'Not enough budget.' };
  team.budget -= cost;
  team.staff.pitCrewSkill = clamp(team.staff.pitCrewSkill + Math.round(rand(3, 8)), 0, 100);
  return { ok: true, msg: `Pit crew improved to skill ${team.staff.pitCrewSkill}.` };
}

function trainDriver(team, driverIndex, cost) {
  const d = team.drivers[driverIndex];
  if (!d) return { ok: false, msg: 'Invalid driver.' };
  if (team.budget < cost) return { ok: false, msg: 'Not enough budget.' };
  team.budget -= cost;
  const gain = Math.round(rand(1, 3));
  d.skill = clamp(d.skill + gain, 0, 100);
  return { ok: true, msg: `${d.name} trained. Skill +${gain} (now ${d.skill}).` };
}

function negotiateContract(team, driverIndex, years) {
  const d = team.drivers[driverIndex];
  if (!d) return { ok: false, msg: 'Invalid driver.' };
  const cost = years * 1_000_000 * (d.skill / 50);
  if (team.budget < cost) return { ok: false, msg: 'Not enough budget to extend contract.' };
  team.budget -= cost;
  d.contractYears = years;
  return { ok: true, msg: `${d.name} signed for ${years} more year(s). Cost: $${Math.round(cost).toLocaleString()}.` };
}

function driverMoraleUpdate(driver, delta) {
  driver.morale = clamp(driver.morale + delta, 0, 100);
}

function ageDrivers(team) {
  for (const d of team.drivers) {
    d.age += 1;
    if (d.age > 38 && chance(15)) {
      d.retiring = true;
    }
  }
}

// ---- 16-20: Scouting & academy ----
function scoutJuniorDriver(team, cost) {
  if (team.budget < cost) return { ok: false, msg: 'Not enough budget.' };
  team.budget -= cost;
  const junior = {
    name: `Academy Junior ${team.juniors.length + 1}`,
    skill: Math.round(rand(30, 60)),
    age: Math.round(rand(16, 20)),
    potential: Math.round(rand(50, 99))
  };
  team.juniors.push(junior);
  return { ok: true, msg: `Scouted ${junior.name} (skill ${junior.skill}, potential ${junior.potential}).` };
}

function promoteJunior(team, juniorIndex, driverSlot) {
  const junior = team.juniors[juniorIndex];
  if (!junior) return { ok: false, msg: 'Invalid junior.' };
  team.drivers[driverSlot] = {
    name: junior.name, skill: junior.skill, morale: 70, age: junior.age,
    contractYears: 2, wins: 0, podiums: 0, points: 0
  };
  team.juniors.splice(juniorIndex, 1);
  return { ok: true, msg: `${junior.name} promoted to the race seat.` };
}

// ---- 21-25: Finance ----
function negotiateSponsor(team) {
  const payout = Math.round(rand(2_000_000, 10_000_000) * (1 + team.reputation / 100));
  team.sponsors.push({ name: `Sponsor ${team.sponsors.length + 1}`, payout });
  team.budget += payout;
  return { ok: true, msg: `New sponsor deal signed worth $${payout.toLocaleString()}.` };
}

function payPrizeMoney(team, position) {
  const table = [50, 43, 36, 31, 27, 24, 22, 20, 18, 16];
  const amount = (table[position - 1] || 5) * 100_000;
  team.budget += amount;
  return amount;
}

function financialReport(team) {
  return `Budget: $${team.budget.toLocaleString()} | Reputation: ${team.reputation} | Sponsors: ${team.sponsors.length}`;
}

// ---- 26-35: Race weekend simulation ----
function carPerformanceScore(team) {
  const { aero, engine, chassis, reliability } = team.car;
  return (aero + engine + chassis) / 3 * (reliability / 100);
}

function simulatePractice(team) {
  const score = carPerformanceScore(team) + rand(-5, 5);
  return { ok: true, msg: `Practice complete. Pace index: ${score.toFixed(1)}` };
}

function simulateQualifying(team, driver) {
  const base = carPerformanceScore(team) + driver.skill / 2;
  const gridPos = clamp(Math.round(rand(1, 20) - (base - 50) / 5), 1, 20);
  return gridPos;
}

function weatherRoll() {
  const roll = Math.random();
  if (roll < 0.6) return 'Dry';
  if (roll < 0.85) return 'Overcast';
  return 'Wet';
}

function tyreStrategyOutcome(strategy, weather) {
  const good = (strategy === 'Wet' && weather === 'Wet') ||
               (strategy === 'Dry' && weather !== 'Wet');
  return good ? rand(0, 3) : rand(-6, -1);
}

function safetyCarCheck() {
  return chance(20);
}

function mechanicalFailureCheck(team) {
  const failChance = clamp(15 - team.car.reliability / 10, 1, 15);
  return chance(failChance);
}

function simulateRace(team, driver, gridPos, strategy) {
  if (mechanicalFailureCheck(team)) {
    return { finished: false, position: null, msg: `${driver.name} retired with a mechanical failure.` };
  }
  const weather = weatherRoll();
  const vsc = safetyCarCheck();
  const perf = carPerformanceScore(team) + driver.skill / 2 + tyreStrategyOutcome(strategy, weather)
    + (vsc ? rand(-3, 3) : 0) + team.staff.pitCrewSkill / 20;
  let position = clamp(Math.round(gridPos - (perf - 50) / 4), 1, 20);
  return { finished: true, position, weather, vsc, msg: null };
}

// ---- 36-40: Points, standings, results history ----
function pointsForPosition(position) {
  const table = [25, 18, 15, 12, 10, 8, 6, 4, 2, 1];
  return table[position - 1] || 0;
}

function applyRaceResult(team, driver, result) {
  if (!result.finished) {
    team.history.push({ driver: driver.name, result: 'DNF' });
    return;
  }
  const pts = pointsForPosition(result.position);
  driver.points += pts;
  team.standingsPoints += pts;
  if (result.position === 1) driver.wins += 1;
  if (result.position <= 3) driver.podiums += 1;
  team.budget += payPrizeMoney(team, result.position);
  driverMoraleUpdate(driver, result.position <= 5 ? rand(2, 6) : rand(-4, 0));
  team.history.push({ driver: driver.name, result: `P${result.position}`, points: pts });
}

// ---- 41-45: Reputation, penalties, rivalries, trophies, press ----
function updateReputation(team, delta) {
  team.reputation = clamp(team.reputation + delta, 0, 100);
}

function applyPenalty(team, seconds) {
  return `Penalty applied: +${seconds}s for a technical infringement.`;
}

function awardTrophy(team, title) {
  team.trophyCabinet.push({ title, season: null });
}

function pressConference(team) {
  const lines = [
    'The team principal praised recent progress and stayed cautiously optimistic.',
    'Questions focused on the upcoming upgrade package.',
    'A driver commented on strong morale within the garage.',
    'Reporters pressed on budget allocation for the rest of the season.'
  ];
  return lines[Math.floor(rand(0, lines.length))];
}

// ---- 46-50: Season / league / trade ----
function endOfSeasonAwards(db) {
  const lb = require('./database').getLeaderboard(db);
  return lb.slice(0, 3).map((t, i) => `${i + 1}. ${t.name} - ${t.standingsPoints} pts`).join('\n');
}

function tradeDriver(teamA, teamB, indexA, indexB) {
  const temp = teamA.drivers[indexA];
  teamA.drivers[indexA] = teamB.drivers[indexB];
  teamB.drivers[indexB] = temp;
}

function retireDriver(team, index) {
  const d = team.drivers.splice(index, 1)[0];
  return d;
}

function resetForNewSeason(db) {
  db.season += 1;
  db.race = 1;
  for (const team of Object.values(db.teams)) {
    ageDrivers(team);
  }
}

// ---- 51-60: Driver market (real driver pool) ----
function signFreeAgent(team, driverData, slot) {
  if (team.budget < driverData.price) return { ok: false, msg: `Not enough budget. ${driverData.name} costs $${driverData.price.toLocaleString()}.` };
  team.budget -= driverData.price;
  team.drivers[slot] = {
    poolId: driverData.id,
    name: driverData.name,
    skill: driverData.skill,
    morale: 75,
    age: driverData.age,
    contractYears: 2,
    wins: 0, podiums: 0, points: 0
  };
  return { ok: true, msg: `Signed ${driverData.name} to the race seat for $${driverData.price.toLocaleString()}.` };
}

function releaseDriver(team, slot) {
  const d = team.drivers[slot];
  team.drivers[slot] = { name: `Reserve Driver`, skill: 40, morale: 60, age: 20, contractYears: 1, wins: 0, podiums: 0, points: 0 };
  return d;
}

function driverMarketValue(driverData) {
  return Math.round(driverData.price * (1 + driverData.skill / 200));
}

function biddingWar(driverData, offers) {
  return offers.sort((a, b) => b.amount - a.amount)[0];
}

// ---- 61-70: Qualifying knockout format ----
function qualifyingQ1(teams) {
  return teams.map(t => ({ team: t, time: rand(80, 95) - carPerformanceScore(t) / 10 })).sort((a, b) => a.time - b.time);
}

function eliminateBottom(results, count) {
  return results.slice(0, results.length - count);
}

function fastestLapBonus(team) {
  return chance(15);
}

function driverOfTheDay(driverName) {
  return `${driverName} is voted Driver of the Day by fans.`;
}

// ---- 71-80: Weekend hazards & penalties ----
function redFlagCheck() {
  return chance(8);
}

function collisionRisk(driverA, driverB) {
  return chance(5 - (driverA.skill + driverB.skill) / 40);
}

function pitLaneSpeedingPenalty() {
  return chance(4);
}

function stewardInvestigation() {
  return chance(10);
}

function gridPenaltyForEngine(team) {
  if (team.car.reliability < 40 && chance(20)) return 5;
  return 0;
}

// ---- 81-90: Team progression & morale economy ----
function teamPrincipalBonus(team) {
  return team.reputation > 70 ? 1.1 : 1.0;
}

function fanEngagementScore(team) {
  return clamp(Math.round(team.reputation + team.drivers.reduce((s, d) => s + d.wins * 2, 0)), 0, 100);
}

function merchandiseRevenue(team) {
  const amount = Math.round(fanEngagementScore(team) * rand(5000, 20000));
  team.budget += amount;
  return amount;
}

function costCapCheck(team) {
  return team.budget < 0 ? 'Over cost cap — financial penalty risk!' : 'Within cost cap.';
}

function loyaltyBonus(driver) {
  return driver.contractYears >= 3 ? 5 : 0;
}

// ---- 91-100: Track characteristics & misc systems ----
function trackType(raceIndex) {
  const highDownforce = ['Monaco', 'Hungary', 'Singapore'];
  const track = buildCalendarRef()[raceIndex % buildCalendarRef().length];
  return highDownforce.includes(track) ? 'High Downforce' : 'Balanced/Low Downforce';
}

function buildCalendarRef() {
  return require('./database').buildCalendar();
}

function trackEvolution(sessionNumber) {
  return sessionNumber * rand(0.1, 0.3);
}

function temperatureEffect(weather) {
  return weather === 'Wet' ? -3 : rand(-1, 1);
}

function newsEvent() {
  const events = [
    'A rival team unveils a major upgrade package.',
    'Paddock rumors swirl about a driver market shake-up.',
    'The FIA announces a new technical directive for next round.',
    'A sponsor praises the team\'s recent form in a press release.'
  ];
  return events[Math.floor(rand(0, events.length))];
}

function seasonAchievement(team) {
  if (team.standingsPoints > 300) return 'Championship Contender';
  if (team.standingsPoints > 150) return 'Midfield Battler';
  return 'Building for the Future';
}

module.exports = {
  upgradeCarPart, windTunnelResearch, reliabilityProgram,
  upgradeFacility,
  hirePitCrew, trainDriver, negotiateContract, driverMoraleUpdate, ageDrivers,
  scoutJuniorDriver, promoteJunior,
  negotiateSponsor, payPrizeMoney, financialReport,
  carPerformanceScore, simulatePractice, simulateQualifying, weatherRoll,
  tyreStrategyOutcome, safetyCarCheck, mechanicalFailureCheck, simulateRace,
  pointsForPosition, applyRaceResult,
  updateReputation, applyPenalty, awardTrophy, pressConference,
  endOfSeasonAwards, tradeDriver, retireDriver, resetForNewSeason,
  signFreeAgent, releaseDriver, driverMarketValue, biddingWar,
  qualifyingQ1, eliminateBottom, fastestLapBonus, driverOfTheDay,
  redFlagCheck, collisionRisk, pitLaneSpeedingPenalty, stewardInvestigation, gridPenaltyForEngine,
  teamPrincipalBonus, fanEngagementScore, merchandiseRevenue, costCapCheck, loyaltyBonus,
  trackType, trackEvolution, temperatureEffect, newsEvent, seasonAchievement
};

/*
 100 F1 MANAGER 2025-INSPIRED FEATURES — see commands.js for the ones
 exposed as slash commands/buttons. Groups 1-50 are in the block below
 this comment used to live; they're now folded into the exports above
 alongside groups 51-100:
 51-60 Driver market (real drivers, signing, release, market value, bidding)
 61-70 Qualifying knockout stages, fastest lap bonus, driver of the day
 71-80 Red flags, collisions, pit lane penalties, steward investigations, grid penalties
 81-90 Team principal bonus, fan engagement, merchandise revenue, cost cap, loyalty bonus
 91-100 Track type/downforce, track evolution, temperature effects, news events, season achievements
*/
