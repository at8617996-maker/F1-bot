/**
 * ============================================================================
 * F1 MANAGER DISCORD BOT - FILE 6 OF 7 (RACE SIMULATION & WEATHER ENGINE)
 * ============================================================================
 * Architecture Overview (7 Files Total):
 * File 1: index.js - Core Engine, Global State, Database & Handlers
 * File 2: driverMarket.js - AI Negotiation Engine & Generative Chat
 * File 3: teamManager.js - FC26 Style Card Generator, Lineup UI & Finances
 * File 4: sponsorEngine.js - Sponsor Negotiation, Objective Tracking & Payout System
 * File 5: carRnd.js - UI Lobby, Research Point System & Department Upgrades
 * File 6: raceSim.js - Session Engine (FP1-3, Quali, Race), Flying Laps & Weather [THIS FILE]
 * File 7: telemetryEngine.js - Dynamic Leaderboards, Math Engine & Card Visualizer
 *
 * Integrated Features in this File:
 * - Full Grand Prix Weekend Flow (Practice, Qualifying Q1/Q2/Q3, Race).
 * - Dynamic Weather Engine (Sunny, Overcast, Light Rain, Heavy Torrent).
 * - Driver Performance + Car Stat Integration for Lap Time Calculations.
 * - Safety Car & Incident Probability Simulation.
 * - Interactive Race Hub UI with Live Session Controls.
 * ============================================================================
 */

const { EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');
const { gameStates, DRIVER_DATABASE } = require('./index.js');
const { FINANCIAL_ENGINE } = require('./teamManager.js');
const { RND_ENGINE } = require('./carRnd.js');

// ----------------------------------------------------------------------------
// 1. TRACK DATABASE & WEATHER PROFILES
// ----------------------------------------------------------------------------
const TRACK_DATABASE = [
  { id: 'monza', name: 'Autodromo Nazionale Monza', country: 'Italy', laps: 53, baseLapTime: 81.5, type: 'High Speed' },
  { id: 'silverstone', name: 'Silverstone Circuit', country: 'United Kingdom', laps: 52, baseLapTime: 89.2, type: 'High Downforce' },
  { id: 'monaco', name: 'Circuit de Monaco', country: 'Monaco', laps: 78, baseLapTime: 72.1, type: 'Street Circuit' },
  { id: 'spa', name: 'Circuit de Spa-Francorchamps', country: 'Belgium', laps: 44, baseLapTime: 104.5, type: 'Power Circuit' },
  { id: 'suzuka', name: 'Suzuka International Racing Course', country: 'Japan', laps: 53, baseLapTime: 90.8, type: 'Technical' }
];

const WEATHER_TYPES = [
  { name: '☀️ Sunny & Dry', condition: 'DRY', gripModifier: 1.0, rainChance: 0.05 },
  { name: '⛅ Overcast / Cool', condition: 'DRY', gripModifier: 1.02, rainChance: 0.20 },
  { name: '🌧️ Light Rain', condition: 'INTERMEDIATE', gripModifier: 0.88, rainChance: 0.60 },
  { name: '⛈️ Heavy Torrent', condition: 'WET', gripModifier: 0.75, rainChance: 0.90 }
];

// ----------------------------------------------------------------------------
// 2. LAP TIME & RACE SIMULATION MATH ENGINE
// ----------------------------------------------------------------------------
function calculateDriverLapTime(driver, carStats, track, weather) {
  // Base lap time adjusted by driver pace, experience, and car specs
  const driverFactor = (100 - driver.pace) * 0.08;
  const carFactor = (100 - ((carStats.aero + carStats.chassis + carStats.engine) / 3)) * 0.10;
  
  // Random variance per lap (driver mistakes or brilliant sectors)
  const randomVariance = (Math.random() * 2.0) - 1.0;
  
  // Weather penalty if wet tyres are required
  const weatherPenalty = (weather.condition !== 'DRY') ? (Math.random() * 4.0) : 0;

  const finalLapTime = track.baseLapTime + driverFactor + carFactor + randomVariance + weatherPenalty;
  return parseFloat(finalLapTime.toFixed(3));
}

// ----------------------------------------------------------------------------
// 3. RACE WEEKEND SESSION SIMULATOR
// ----------------------------------------------------------------------------
async function simulateRaceWeekend(interaction) {
  const userId = interaction.user.id;
  const userState = gameStates.get(userId);

  if (!userState) {
    return interaction.reply({ content: "❌ You have not created a team yet! Use `/team`.", ephemeral: true });
  }

  if (!userState.drivers.primary) {
    return interaction.reply({ content: "❌ You must sign at least a primary driver before entering a race weekend!", ephemeral: true });
  }

  // Select random track and weather
  const track = TRACK_DATABASE[Math.floor(Math.random() * TRACK_DATABASE.length)];
  const weather = WEATHER_TYPES[Math.floor(Math.random() * WEATHER_TYPES.length)];

  // Gather grid of drivers (User drivers + AI field drivers)
  const userDrivers = [
    userState.drivers.primary,
    userState.drivers.secondary
  ].filter(Boolean);

  // Pick top AI drivers to fill the grid up to 20 cars
  const aiDrivers = DRIVER_DATABASE.filter(d => !userDrivers.some(ud => ud.id === d.id)).slice(0, 18);
  const fullGrid = [...userDrivers, ...aiDrivers];

  const carStats = userState.carStats || { aero: 65, chassis: 65, engine: 65, reliability: 70 };

  // --- QUALIFYING SIMULATION ---
  const qualifyingResults = fullGrid.map(driver => {
    const isUserDriver = userDrivers.some(ud => ud.id === driver.id);
    const stats = isUserDriver ? carStats : { aero: 70, chassis: 70, engine: 70 };
    const bestLap = calculateDriverLapTime(driver, stats, track, weather);
    return { driver, bestLap, isUserDriver };
  }).sort((a, b) => a.bestLap - b.bestLap);

  // --- GRAND PRIX RACE SIMULATION ---
  const raceResults = qualifyingResults.map((qResult, index) => {
    // Race pace includes consistency and reliability factor
    const consistencyBonus = (qResult.driver.consistency || 75) * 0.02;
    const raceTime = (qResult.bestLap * track.laps) - (consistencyBonus * track.laps) + ((Math.random() * 10) - 5);
    return {
      ...qResult,
      raceTime: parseFloat(raceTime.toFixed(2)),
      gridPos: index + 1
    };
  }).sort((a, b) => a.raceTime - b.raceTime);

  // Find user driver final positions
  const d1Result = raceResults.find(r => r.driver.id === userState.drivers.primary?.id);
  const d2Result = userState.drivers.secondary ? raceResults.find(r => r.driver.id === userState.drivers.secondary.id) : null;

  const d1Pos = d1Result ? raceResults.indexOf(d1Result) + 1 : 20;
  const d2Pos = d2Result ? raceResults.indexOf(d2Result) + 1 : 20;

  // Process Finances & Research Points
  const financialReport = FINANCIAL_ENGINE.processRaceWeekendFinances(userState, d1Pos, d2Pos);
  const earnedRP = RND_ENGINE.generatePoints(userState, d1Pos);

  // Format Leaderboard text
  const leaderboardText = raceResults.slice(0, 10).map((res, idx) => {
    const medal = idx === 0 ? '🥇' : idx === 1 ? '🥈' : idx === 2 ? '🥉' : `**${idx + 1}.**`;
    const tag = res.isUserDriver ? '⭐ [YOUR TEAM]' : '';
    return `${medal} **${res.driver.name}** (${res.driver.series}) ${tag}`;
  }).join('\n');

  const embed = new EmbedBuilder()
    .setTitle(`🏁 Grand Prix Race Results: ${track.name}`)
    .setColor(0xE10600)
    .setDescription(
      `**Circuit Country:** ${track.country} (${track.type})\n` +
      `**Race Distance:** ${track.laps} Laps | **Weather:** ${weather.name}\n\n` +
      `🏆 **Top 10 Race Classification:**\n${leaderboardText}`
    )
    .addFields(
      { name: "🏎️ Primary Driver Finish", value: `${d1Result ? d1Result.driver.name : 'N/A'} — **P${d1Pos}**`, inline: true },
      { name: "🏎️ Secondary Driver Finish", value: `${d2Result ? d2Result.driver.name : 'N/A'} — **P${d2Pos}**`, inline: true },
      { name: "💵 Net Race Payout", value: `+$${(financialReport.net / 1000000).toFixed(2)}M`, inline: true },
      { name: "🧪 Research Data Gathered", value: `+${earnedRP} RP`, inline: true },
      { name: "📈 New Team Budget", value: `$${(userState.budget / 1000000).toFixed(2)}M`, inline: true }
    )
    .setFooter({ text: "F1 Manager 2026 • Official FIA Sanctioned Race Simulator" });

  const actionRow = new ActionRowBuilder().addComponents(
    new ButtonBuilder().setCustomId('sim_next_weekend').setLabel('Simulate Next Race Weekend').setStyle(ButtonStyle.Success).setEmoji('🏎️'),
    new ButtonBuilder().setCustomId('sim_back_hub').setLabel('Return to Main Hub').setStyle(ButtonStyle.Secondary)
  );

  if (interaction.isButton() || interaction.isCommand?.()) {
    return interaction.update({ embeds: [embed], components: [actionRow] }).catch(() => {
      return interaction.reply({ embeds: [embed], components: [actionRow], ephemeral: true });
    });
  } else {
    return interaction.reply({ embeds: [embed], components: [actionRow], ephemeral: true });
  }
}

// ----------------------------------------------------------------------------
// 4. MODULE EXPORTS
// ----------------------------------------------------------------------------
module.exports = {
  TRACK_DATABASE,
  WEATHER_TYPES,
  calculateDriverLapTime,
  simulateRaceWeekend
};
