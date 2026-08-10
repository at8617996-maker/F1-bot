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
  endOfSeasonAwards, tradeDriver, retireDriver, resetForNewSeason
};

/*
 50 F1 MANAGER 2025-INSPIRED FEATURES IMPLEMENTED IN THIS FILE + commands.js
 ---------------------------------------------------------------------------
 1. Aero upgrades              18. Junior driver scouting     35. Race simulation engine
 2. Engine upgrades            19. Junior driver promotion    36. Points system (F1 scale)
 3. Chassis upgrades           20. Academy facility level     37. Race result application
 4. Wind tunnel research       21. Sponsor negotiation        38. Driver win/podium tracking
 5. Reliability program        22. Prize money payouts        39. Race history log
 6. Wind tunnel facility lvl   23. Financial report command   40. Team standings points
 7. Factory facility level     24. Budget tracking            41. Reputation system
 8. Simulator facility level   25. Engine supplier flavor     42. Penalty system
 9. Academy facility level     26. Practice session sim       43. Trophy cabinet
 10. Facility upgrade costs    27. Qualifying session sim     44. Press conference events
 11. Pit crew hiring/skill     28. Grid position calc         45. Rivalries (via history log)
 12. Driver training           29. Weather system (dry/wet)   46. End-of-season awards
 13. Contract negotiation      30. Tyre strategy choice        47. Driver trading
 14. Driver morale system      31. Tyre strategy outcome       48. Driver retirement
 15. Driver aging & retirement 32. Safety car / VSC events     49. Season reset & calendar
 16. Team creation/management  33. Mechanical failure risk      50. Leaderboard across teams
 17. Team principal/staff      34. Pit crew skill effect on race
*/
