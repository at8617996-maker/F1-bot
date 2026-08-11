/**
 * ============================================================================
 * F1 MANAGER DISCORD BOT - FILE 1 OF 7 (MAIN ENGINE & CORE DATABASE)
 * ============================================================================
 * Architecture Overview (7 Files Total):
 * File 1: index.js - Core Engine, Global State, Database & Handlers [THIS FILE]
 * File 2: driverMarket.js - AI Negotiation Engine, Generative Driver Chat & Card Generator
 * File 3: teamManager.js - Custom Team Creation, Lineup Cards, Logos & Financial Engine
 * File 4: sponsorEngine.js - Sponsor Negotiation, Objective Tracking & Payout System
 * File 5: carRnd.js - UI Lobby, Research Point System & Department Upgrades
 * File 6: raceSim.js - Session Engine (FP1-3, Quali, Race), Flying Laps & Dynamic Weather
 * File 7: telemetryEngine.js - Dynamic Leaderboards, Math Engine & Card Visualizer
 *
 * Integrated 35+ F1 Manager Features:
 * 1. Dynamic Driver Morale Engine          19. Aerodynamic Balance Setup Tool
 * 2. Power Unit Thermal Wear & Heat        20. Dynamic AI Driver Radio Chatter
 * 3. Pit Stop Crew Training & Errors       21. Next-Gen Regulation Overhaul System
 * 4. Facility Upgrades (Wind Tunnel/CFD)   22. Technical Director & Staff Hiring
 * 5. Global Scouting Network (F2/F3/F4)    23. Teammate Friction & Rivalry Index
 * 6. FIA Cost Cap Audit & Financial Rules  24. Live Telemetry Sector Delta Tracking
 * 7. Dynamic Track Rubbering & Grip Curve 25. Dirty Air & DRS Train Simulation
 * 8. Tire Thermal Wear Mathematical Model  26. Sprint Weekend Format Integration
 * 9. ERS Deployment & Battery Harvest      27. Reserve Driver Emergency Swap System
 * 10. Engine Component Grid Penalty System 28. Custom Team Livery Color Palette
 * 11. Board Confidence & Job Security Index 29. Engine Mixture & Fuel Load Modes
 * 12. Rival AI Team R&D Development Pace  30. Dynamic Track Temperature Multiplier
 * 13. Sponsor Multi-Tier Objectives        31. Merchandising & Fan Confidence Metric
 * 14. Contract Release Clauses & Buyouts  32. FIA Technical Directives Engine
 * 15. Team Principal Reputation Dynamics   33. Youth Driver Skill Progression Curve
 * 16. Safety Car / VSC Strategy Pivots    34. Post-Race Steward Penalty Audits
 * 17. Mechanical DNF Reliability Calculations 35. CFD & Wind Tunnel Allocation Hours
 * ============================================================================
 */

const {
  Client,
  GatewayIntentBits,
  EmbedBuilder,
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  StringSelectMenuBuilder,
  Collection,
  REST,
  Routes
} = require('discord.js');

const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent
  ]
});

// Global Memory Game State Storage
const gameStates = new Map();

// ----------------------------------------------------------------------------
// 1. OFFICIAL 24-RACE CALENDAR DATABASE
// ----------------------------------------------------------------------------
const F1_CALENDAR = [
  { round: 1, name: "Bahrain Grand Prix", track: "Sakhir Circuit", laps: 57, length: "5.412 km", baseWeather: "Clear / Dry", temp: "28°C", tyreDeg: "High", overtaking: "Easy" },
  { round: 2, name: "Saudi Arabian Grand Prix", track: "Jeddah Corniche Circuit", laps: 50, length: "6.174 km", baseWeather: "Clear / Night", temp: "26°C", tyreDeg: "Medium", overtaking: "Medium" },
  { round: 3, name: "Australian Grand Prix", track: "Albert Park Circuit", laps: 58, length: "5.278 km", baseWeather: "Sunny", temp: "22°C", tyreDeg: "Medium", overtaking: "Medium" },
  { round: 4, name: "Japanese Grand Prix", track: "Suzuka Circuit", laps: 53, length: "5.807 km", baseWeather: "Overcast", temp: "18°C", tyreDeg: "Very High", overtaking: "Hard" },
  { round: 5, name: "Chinese Grand Prix", track: "Shanghai Circuit", laps: 56, length: "5.451 km", baseWeather: "Cloudy", temp: "20°C", tyreDeg: "High", overtaking: "Easy" },
  { round: 6, name: "Miami Grand Prix", track: "Miami International Autodrome", laps: 57, length: "5.412 km", baseWeather: "Humid / Rain Risk", temp: "31°C", tyreDeg: "Medium", overtaking: "Medium" },
  { round: 7, name: "Emilia Romagna Grand Prix", track: "Imola Circuit", laps: 63, length: "4.909 km", baseWeather: "Mild", temp: "19°C", tyreDeg: "Medium", overtaking: "Hard" },
  { round: 8, name: "Monaco Grand Prix", track: "Circuit de Monaco", laps: 78, length: "3.337 km", baseWeather: "Sunny", temp: "24°C", tyreDeg: "Low", overtaking: "Very Hard" },
  { round: 9, name: "Canadian Grand Prix", track: "Circuit Gilles Villeneuve", laps: 70, length: "4.361 km", baseWeather: "Unpredictable Rain", temp: "21°C", tyreDeg: "Medium", overtaking: "Easy" },
  { round: 10, name: "Spanish Grand Prix", track: "Circuit de Barcelona-Catalunya", laps: 66, length: "4.657 km", baseWeather: "Hot", temp: "29°C", tyreDeg: "High", overtaking: "Medium" },
  { round: 11, name: "Austrian Grand Prix", track: "Red Bull Ring", laps: 71, length: "4.318 km", baseWeather: "Showers Risk", temp: "23°C", tyreDeg: "Medium", overtaking: "Easy" },
  { round: 12, name: "British Grand Prix", track: "Silverstone Circuit", laps: 52, length: "5.891 km", baseWeather: "Changeable Rain", temp: "19°C", tyreDeg: "High", overtaking: "Medium" },
  { round: 13, name: "Hungarian Grand Prix", track: "Hungaroring", laps: 70, length: "4.381 km", baseWeather: "Scorching Hot", temp: "33°C", tyreDeg: "High", overtaking: "Hard" },
  { round: 14, name: "Belgian Grand Prix", track: "Circuit de Spa-Francorchamps", laps: 44, length: "7.004 km", baseWeather: "Heavy Rain Risk", temp: "17°C", tyreDeg: "Medium", overtaking: "Easy" },
  { round: 15, name: "Dutch Grand Prix", track: "Circuit Zandvoort", laps: 72, length: "4.259 km", baseWeather: "Windy / Cool", temp: "18°C", tyreDeg: "High", overtaking: "Hard" },
  { round: 16, name: "Italian Grand Prix", track: "Monza Circuit", laps: 53, length: "5.793 km", baseWeather: "Warm / Clear", temp: "27°C", tyreDeg: "Low", overtaking: "Easy" },
  { round: 17, name: "Azerbaijan Grand Prix", track: "Baku City Circuit", laps: 51, length: "6.003 km", baseWeather: "Windy", temp: "25°C", tyreDeg: "Low", overtaking: "Very Easy" },
  { round: 18, name: "Singapore Grand Prix", track: "Marina Bay Street Circuit", laps: 62, length: "4.940 km", baseWeather: "Humid / Night", temp: "30°C", tyreDeg: "High", overtaking: "Hard" },
  { round: 19, name: "United States Grand Prix", track: "Circuit of the Americas", laps: 56, length: "5.513 km", baseWeather: "Sunny / Warm", temp: "28°C", tyreDeg: "High", overtaking: "Easy" },
  { round: 20, name: "Mexico City Grand Prix", track: "Autódromo Hermanos Rodríguez", laps: 71, length: "4.304 km", baseWeather: "Warm / Thin Air", temp: "24°C", tyreDeg: "Medium", overtaking: "Medium" },
  { round: 21, name: "São Paulo Grand Prix", track: "Interlagos Circuit", laps: 71, length: "4.309 km", baseWeather: "Stormy / Dynamic", temp: "22°C", tyreDeg: "Medium", overtaking: "Easy" },
  { round: 22, name: "Las Vegas Grand Prix", track: "Las Vegas Strip Circuit", laps: 50, length: "6.201 km", baseWeather: "Cold Night", temp: "12°C", tyreDeg: "Low", overtaking: "Easy" },
  { round: 23, name: "Qatar Grand Prix", track: "Lusail Circuit", laps: 57, length: "5.419 km", baseWeather: "Intense Heat", temp: "32°C", tyreDeg: "Extreme", overtaking: "Medium" },
  { round: 24, name: "Abu Dhabi Grand Prix", track: "Yas Marina Circuit", laps: 58, length: "5.281 km", baseWeather: "Twilight / Clear", temp: "26°C", tyreDeg: "Medium", overtaking: "Medium" }
];

// ----------------------------------------------------------------------------
// 2. REAL DRIVER MARKET DATABASE (F1, F2, F3, F4 DRIVERS)
// ----------------------------------------------------------------------------
const DRIVER_DATABASE = [
  // F1 DRIVERS
  { id: "verstappen", name: "Max Verstappen", series: "F1", rating: 96, pace: 98, consistency: 95, exp: 92, salary: 55000000, team: "Red Bull Racing", cardUrl: "https://i.imgur.com/v1.png" },
  { id: "hamilton", name: "Lewis Hamilton", series: "F1", rating: 94, pace: 93, consistency: 95, exp: 99, salary: 45000000, team: "Ferrari", cardUrl: "https://i.imgur.com/v2.png" },
  { id: "leclerc", name: "Charles Leclerc", series: "F1", rating: 92, pace: 95, consistency: 88, exp: 86, salary: 34000000, team: "Ferrari", cardUrl: "https://i.imgur.com/v3.png" },
  { id: "norris", name: "Lando Norris", series: "F1", rating: 91, pace: 92, consistency: 90, exp: 84, salary: 25000000, team: "McLaren", cardUrl: "https://i.imgur.com/v4.png" },
  { id: "piastri", name: "Oscar Piastri", series: "F1", rating: 88, pace: 89, consistency: 87, exp: 76, salary: 12000000, team: "McLaren", cardUrl: "https://i.imgur.com/v5.png" },
  { id: "russell", name: "George Russell", series: "F1", rating: 89, pace: 90, consistency: 88, exp: 83, salary: 18000000, team: "Mercedes", cardUrl: "https://i.imgur.com/v6.png" },
  { id: "alonso", name: "Fernando Alonso", series: "F1", rating: 92, pace: 90, consistency: 94, exp: 99, salary: 22000000, team: "Aston Martin", cardUrl: "https://i.imgur.com/v7.png" },
  { id: "sainz", name: "Carlos Sainz", series: "F1", rating: 89, pace: 88, consistency: 91, exp: 88, salary: 15000000, team: "Williams", cardUrl: "https://i.imgur.com/v8.png" },
  { id: "antonelli", name: "Kimi Antonelli", series: "F1", rating: 82, pace: 86, consistency: 78, exp: 60, salary: 6000000, team: "Mercedes", cardUrl: "https://i.imgur.com/v9.png" },
  { id: "bearman", name: "Oliver Bearman", series: "F1", rating: 81, pace: 83, consistency: 79, exp: 62, salary: 4000000, team: "Haas", cardUrl: "https://i.imgur.com/v10.png" },
  { id: "lawson", name: "Liam Lawson", series: "F1", rating: 80, pace: 82, consistency: 80, exp: 65, salary: 3500000, team: "Racing Bulls", cardUrl: "https://i.imgur.com/v11.png" },
  { id: "gasly", name: "Pierre Gasly", series: "F1", rating: 84, pace: 84, consistency: 85, exp: 85, salary: 10000000, team: "Alpine", cardUrl: "https://i.imgur.com/v12.png" },
  { id: "albon", name: "Alexander Albon", series: "F1", rating: 85, pace: 86, consistency: 85, exp: 84, salary: 9000000, team: "Williams", cardUrl: "https://i.imgur.com/v13.png" },
  { id: "hulkenberg", name: "Nico Hülkenberg", series: "F1", rating: 83, pace: 84, consistency: 86, exp: 90, salary: 7000000, team: "Sauber / Audi", cardUrl: "https://i.imgur.com/v14.png" },
  { id: "ocon", name: "Esteban Ocon", series: "F1", rating: 83, pace: 83, consistency: 83, exp: 85, salary: 8000000, team: "Haas", cardUrl: "https://i.imgur.com/v15.png" },
  { id: "tsunoda", name: "Yuki Tsunoda", series: "F1", rating: 82, pace: 84, consistency: 79, exp: 80, salary: 5000000, team: "Racing Bulls", cardUrl: "https://i.imgur.com/v16.png" },
  { id: "stroll", name: "Lance Stroll", series: "F1", rating: 78, pace: 77, consistency: 79, exp: 85, salary: 10000000, team: "Aston Martin", cardUrl: "https://i.imgur.com/v17.png" },
  { id: "doohan", name: "Jack Doohan", series: "F1", rating: 77, pace: 79, consistency: 75, exp: 58, salary: 2500000, team: "Alpine", cardUrl: "https://i.imgur.com/v18.png" },
  { id: "bortoleto", name: "Gabriel Bortoleto", series: "F1", rating: 79, pace: 81, consistency: 78, exp: 60, salary: 3000000, team: "Sauber / Audi", cardUrl: "https://i.imgur.com/v19.png" },
  { id: "hadjar", name: "Isack Hadjar", series: "F1", rating: 78, pace: 80, consistency: 75, exp: 59, salary: 2000000, team: "Racing Bulls", cardUrl: "https://i.imgur.com/v20.png" },

  // F2 PROSPECTS
  { id: "maloney", name: "Zane Maloney", series: "F2", rating: 76, pace: 78, consistency: 73, exp: 50, salary: 1200000, team: "Rodin Motorsport", cardUrl: "https://i.imgur.com/f2_1.png" },
  { id: "aron", name: "Paul Aron", series: "F2", rating: 77, pace: 79, consistency: 74, exp: 52, salary: 1100000, team: "Hitech Pulse-Eight", cardUrl: "https://i.imgur.com/f2_2.png" },
  { id: "crawford", name: "Jak Crawford", series: "F2", rating: 75, pace: 76, consistency: 75, exp: 53, salary: 900000, team: "DAMS Lucas Oil", cardUrl: "https://i.imgur.com/f2_3.png" },
  { id: "hauger", name: "Dennis Hauger", series: "F2", rating: 75, pace: 77, consistency: 72, exp: 55, salary: 1000000, team: "MP Motorsport", cardUrl: "https://i.imgur.com/f2_4.png" },
  { id: "colapinto", name: "Franco Colapinto", series: "F2", rating: 78, pace: 81, consistency: 76, exp: 58, salary: 1500000, team: "MP Motorsport", cardUrl: "https://i.imgur.com/f2_5.png" },
  { id: "maini", name: "Kush Maini", series: "F2", rating: 74, pace: 75, consistency: 73, exp: 51, salary: 850000, team: "Invicta Racing", cardUrl: "https://i.imgur.com/f2_6.png" },
  { id: "martins", name: "Victor Martins", series: "F2", rating: 76, pace: 80, consistency: 70, exp: 54, salary: 1100000, team: "ART Grand Prix", cardUrl: "https://i.imgur.com/f2_7.png" },
  { id: "osullivan", name: "Zak O'Sullivan", series: "F2", rating: 73, pace: 74, consistency: 73, exp: 48, salary: 800000, team: "ART Grand Prix", cardUrl: "https://i.imgur.com/f2_8.png" },

  // F3 PROSPECTS
  { id: "fornaroli", name: "Leonardo Fornaroli", series: "F3", rating: 72, pace: 73, consistency: 76, exp: 40, salary: 500000, team: "Trident", cardUrl: "https://i.imgur.com/f3_1.png" },
  { id: "mini", name: "Gabriele Minì", series: "F3", rating: 73, pace: 76, consistency: 70, exp: 42, salary: 550000, team: "PREMA Racing", cardUrl: "https://i.imgur.com/f3_2.png" },
  { id: "browning", name: "Luke Browning", series: "F3", rating: 72, pace: 74, consistency: 71, exp: 41, salary: 480000, team: "Hitech Pulse-Eight", cardUrl: "https://i.imgur.com/f3_3.png" },
  { id: "lindblad", name: "Arvid Lindblad", series: "F3", rating: 74, pace: 77, consistency: 72, exp: 38, salary: 600000, team: "PREMA Racing", cardUrl: "https://i.imgur.com/f3_4.png" },
  { id: "beganovic", name: "Dino Beganovic", series: "F3", rating: 71, pace: 73, consistency: 70, exp: 40, salary: 450000, team: "PREMA Racing", cardUrl: "https://i.imgur.com/f3_5.png" },

  // F4 ROOKIES
  { id: "slater", name: "Freddie Slater", series: "F4", rating: 68, pace: 72, consistency: 65, exp: 25, salary: 250000, team: "SBD Prema", cardUrl: "https://i.imgur.com/f4_1.png" },
  { id: "powell", name: "Alex Powell", series: "F4", rating: 67, pace: 70, consistency: 64, exp: 22, salary: 200000, team: "Prema Racing", cardUrl: "https://i.imgur.com/f4_2.png" },
  { id: "nakamura", name: "Kean Nakamura-Berta", series: "F4", rating: 66, pace: 69, consistency: 63, exp: 20, salary: 180000, team: "Mumbai Falcons", cardUrl: "https://i.imgur.com/f4_3.png" }
];

// ----------------------------------------------------------------------------
// 3. R&D CAR UPGRADES & RESEARCH DEPARTMENTS
// ----------------------------------------------------------------------------
const RND_DEPARTMENTS = {
  aerodynamics: {
    name: "Aerodynamics Department",
    icon: "💨",
    parts: [
      { id: "front_wing", name: "Front Wing Assembly", costRP: 350, costCash: 2500000, topSpeed: +2, cornering: +6, drag: -3 },
      { id: "rear_wing", name: "Rear Wing & DRS Flap", costRP: 400, costCash: 3000000, topSpeed: +5, cornering: +3, drag: -5 },
      { id: "floor_tunnels", name: "Floor & Venturi Tunnels", costRP: 600, costCash: 5000000, topSpeed: +3, cornering: +10, drag: -2 },
      { id: "sidepods", name: "Sidepod Radiator Inlets", costRP: 300, costCash: 2000000, topSpeed: +2, cooling: +8, drag: -4 }
    ]
  },
  chassis: {
    name: "Chassis & Suspension Department",
    icon: "🏎️",
    parts: [
      { id: "monocoque", name: "Carbon Composite Monocoque", costRP: 500, costCash: 4500000, weight: -8, safety: +10, cornering: +4 },
      { id: "front_susp", name: "Push-rod Front Suspension", costRP: 350, costCash: 2200000, tyreWear: -6, cornering: +5 },
      { id: "rear_susp", name: "Pull-rod Rear Suspension", costRP: 380, costCash: 2400000, traction: +7, tyreWear: -4 },
      { id: "brake_ducts", name: "Carbon Brake Cooling Ducts", costRP: 250, costCash: 1500000, braking: +8, cooling: +5 }
    ]
  },
  powertrain: {
    name: "Powertrain & ERS Department",
    icon: "⚡",
    parts: [
      { id: "ice_engine", name: "Internal Combustion Engine (ICE)", costRP: 700, costCash: 6500000, power: +12, topSpeed: +8, reliability: -2 },
      { id: "mgu_k", name: "MGU-K Energy Recovery System", costRP: 450, costCash: 3500000, acceleration: +9, ersEfficiency: +10 },
      { id: "mgu_h", name: "MGU-H Heat Energy Recovery", costRP: 480, costCash: 3800000, power: +6, ersEfficiency: +12 },
      { id: "turbocharger", name: "Heavy Duty Turbocharger", costRP: 400, costCash: 3000000, power: +7, acceleration: +5 }
    ]
  }
};

// ----------------------------------------------------------------------------
// 4. RANDOM LOGOS & SPONSOR PRESETS
// ----------------------------------------------------------------------------
const RANDOM_TEAM_LOGOS = [
  "https://i.imgur.com/logo_apex_racing.png",
  "https://i.imgur.com/logo_phantom_gp.png",
  "https://i.imgur.com/logo_valkyrie_f1.png",
  "https://i.imgur.com/logo_nova_motorsport.png",
  "https://i.imgur.com/logo_titan_speed.png",
  "https://i.imgur.com/logo_vortex_engineering.png"
];

// ----------------------------------------------------------------------------
// 5. SPONSOR PRESETS DATABASE
// ----------------------------------------------------------------------------
const SPONSORS_DATABASE = [
  { id: "petroMax", name: "PetroMax Energy", tier: "Title", basePayout: 18000000, objective: "Finish Top 5 in Championship", bonus: 5000000 },
  { id: "cyberTech", name: "CyberTech Systems", tier: "Major", basePayout: 12000000, objective: "Score points in 10 races", bonus: 3000000 },
  { id: "quantumAI", name: "Quantum Dynamic", tier: "Major", basePayout: 10000000, objective: "Qualify in Q3 5 times", bonus: 2500000 },
  { id: "apexAero", name: "Apex Aerospace", tier: "Minor", basePayout: 5000000, objective: "Finish above P12 each race", bonus: 1200000 },
  { id: "hyperLube", name: "HyperLube Synthetics", tier: "Minor", basePayout: 4000000, objective: "Zero DNF in 8 races", bonus: 1000000 }
];

// ----------------------------------------------------------------------------
// 6. GAME STATE MANAGEMENT HELPERS
// ----------------------------------------------------------------------------
function createInitialGameState(userId, teamName) {
  const randomLogo = RANDOM_TEAM_LOGOS[Math.floor(Math.random() * RANDOM_TEAM_LOGOS.length)];
  return {
    userId: userId,
    teamName: teamName || "Custom Racing Team",
    logo: randomLogo,
    budget: 45000000,
    researchPoints: 1200,
    currentRound: 1,
    reputation: 65,
    boardConfidence: 80,
    drivers: {
      primary: null,
      secondary: null,
      reserve: null
    },
    carStats: {
      topSpeed: 78,
      cornering: 75,
      acceleration: 76,
      tyreWear: 70,
      reliability: 82,
      cooling: 80
    },
    upgradesInstalled: [],
    sponsors: [],
    activeNegotiation: null
  };
}

// ----------------------------------------------------------------------------
// 7. AI DRIVER CHAT & NEGOTIATION LOGIC
// ----------------------------------------------------------------------------
function generateDriverAIResponse(driver, offerSalary, offerLength, userPatience) {
  const salaryRatio = offerSalary / driver.salary;
  if (salaryRatio >= 1.15) {
    return {
      accepted: true,
      text: `"${driver.name} here. This offer looks outstanding! I am thrilled to join your project. Let's send over the contracts!"`,
      patienceDelta: 0
    };
  } else if (salaryRatio >= 0.90) {
    return {
      accepted: false,
      text: `"${driver.name}'s Agent: We appreciate the proposal, but the base salary is slightly below expectations. Push it closer to $${(driver.salary / 1000000).toFixed(1)}M."`,
      patienceDelta: -1
    };
  } else {
    return {
      accepted: false,
      text: `"${driver.name}'s Agent: This offer is insulting for a driver of my client's status. We need a far higher budget commitment!"`,
      patienceDelta: -2
    };
  }
}

// ----------------------------------------------------------------------------
// 8. SIMULATION MATHEMATICAL ENGINE (CAR PACE + STRATEGY)
// ----------------------------------------------------------------------------
function calculateLapTime(driver, carStats, strategyMode, weather) {
  const baseTime = 85.0; // Base 1:25.000 in seconds
  const driverPaceBonus = (100 - driver.pace) * 0.05;
  const carPerformanceBonus = (100 - ((carStats.topSpeed + carStats.cornering + carStats.acceleration) / 3)) * 0.08;

  let strategyMultiplier = 0.0;
  if (strategyMode === "push") strategyMultiplier = -0.4;
  if (strategyMode === "balanced") strategyMultiplier = 0.0;
  if (strategyMode === "save_tyres") strategyMultiplier = +0.5;

  let weatherPenalty = 0.0;
  if (weather.includes("Rain")) weatherPenalty = +12.5;

  const totalTimeSeconds = baseTime + driverPaceBonus + carPerformanceBonus + strategyMultiplier + weatherPenalty + (Math.random() * 0.3);
  const mins = Math.floor(totalTimeSeconds / 60);
  const secs = (totalTimeSeconds % 60).toFixed(3);
  return `${mins}:${secs < 10 ? '0' : ''}${secs}`;
}

// ----------------------------------------------------------------------------
// 9. DISCORD INTERACTION ROUTER
// ----------------------------------------------------------------------------
client.on('interactionCreate', async (interaction) => {
  if (!interaction.isChatInputCommand() && !interaction.isButton() && !interaction.isStringSelectMenu()) return;

  const userId = interaction.user.id;
  if (!gameStates.has(userId) && interaction.commandName !== 'team') {
    gameStates.set(userId, createInitialGameState(userId, "My Custom F1 Team"));
  }
  const userState = gameStates.get(userId);

  // /calendar Command Logic
  if (interaction.isChatInputCommand() && interaction.commandName === 'calendar') {
    const embed = new EmbedBuilder()
      .setTitle("🗓️ FIA Formula 1 World Championship - 24 Race Calendar")
      .setColor(0xE10600)
      .setDescription("Detailed overview of circuit specs, track laps, tyre degradation, and weather conditions.")
      .setFooter({ text: "F1 Manager 2026 • Page 1 of 3" });

    F1_CALENDAR.slice(0, 8).forEach(gp => {
      embed.addFields({
        name: `Round ${gp.round}: ${gp.name} (${gp.track})`,
        value: `🏁 **Laps:** ${gp.laps} | 📏 **Length:** ${gp.length}\n🌤️ **Weather:** ${gp.baseWeather} (${gp.temp})\n🛞 **Tyre Wear:** ${gp.tyreDeg} | 🏎️ **Overtaking:** ${gp.overtaking}`,
        inline: false
      });
    });

    const row = new ActionRowBuilder().addComponents(
      new ButtonBuilder().setCustomId('calendar_page_1').setLabel('Rounds 1-8').setStyle(ButtonStyle.Primary).setDisabled(true),
      new ButtonBuilder().setCustomId('calendar_page_2').setLabel('Rounds 9-16').setStyle(ButtonStyle.Secondary),
      new ButtonBuilder().setCustomId('calendar_page_3').setLabel('Rounds 17-24').setStyle(ButtonStyle.Secondary)
    );

    return interaction.reply({ embeds: [embed], components: [row] });
  }

  // /team Command Logic
  if (interaction.isChatInputCommand() && interaction.commandName === 'team') {
    const teamName = interaction.options.getString('name') || "Apex F1 Team";
    const newState = createInitialGameState(userId, teamName);
    gameStates.set(userId, newState);

    const embed = new EmbedBuilder()
      .setTitle(`🏁 Team Headquarters: ${newState.teamName}`)
      .setThumbnail(newState.logo)
      .setColor(0x00D26A)
      .addFields(
        { name: "💰 Starting Budget", value: `$${(newState.budget / 1000000).toFixed(1)} Million`, inline: true },
        { name: "🧪 Research Points", value: `${newState.researchPoints} RP`, inline: true },
        { name: "🛡️ Team Rating", value: `68 / 100`, inline: true },
        { name: "🏎️ Driver 1 Seat", value: newState.drivers.primary ? newState.drivers.primary.name : "Vacant", inline: true },
        { name: "🏎️ Driver 2 Seat", value: newState.drivers.secondary ? newState.drivers.secondary.name : "Vacant", inline: true },
        { name: "🔧 Reserve Driver", value: newState.drivers.reserve ? newState.drivers.reserve.name : "Vacant", inline: true }
      )
      .setFooter({ text: "Use /driver search to enter real driver negotiations!" });

    return interaction.reply({ embeds: [embed] });
  }

  // UI Button Intercepts
  if (interaction.isButton()) {
    const customId = interaction.customId;
    if (customId.startsWith('calendar_page_')) {
      const page = parseInt(customId.split('_')[2]);
      const start = (page - 1) * 8;
      const end = start + 8;
      const slice = F1_CALENDAR.slice(start, end);

      const embed = new EmbedBuilder()
        .setTitle(`🗓️ FIA Formula 1 Calendar - Page ${page} of 3`)
        .setColor(0xE10600);

      slice.forEach(gp => {
        embed.addFields({
          name: `Round ${gp.round}: ${gp.name}`,
          value: `🏁 Laps: ${gp.laps} | 🌤️ Weather: ${gp.baseWeather} | 🛞 Wear: ${gp.tyreDeg}`,
          inline: false
        });
      });

      const row = new ActionRowBuilder().addComponents(
        new ButtonBuilder().setCustomId('calendar_page_1').setLabel('Rounds 1-8').setStyle(page === 1 ? ButtonStyle.Primary : ButtonStyle.Secondary).setDisabled(page === 1),
        new ButtonBuilder().setCustomId('calendar_page_2').setLabel('Rounds 9-16').setStyle(page === 2 ? ButtonStyle.Primary : ButtonStyle.Secondary).setDisabled(page === 2),
        new ButtonBuilder().setCustomId('calendar_page_3').setLabel('Rounds 17-24').setStyle(page === 3 ? ButtonStyle.Primary : ButtonStyle.Secondary).setDisabled(page === 3)
      );

      return interaction.update({ embeds: [embed], components: [row] });
    }
  }
});

// ----------------------------------------------------------------------------
// 10. MODULE EXPORTS & BOT INITIALIZATION
// ----------------------------------------------------------------------------
module.exports = {
  client,
  gameStates,
  F1_CALENDAR,
  DRIVER_DATABASE,
  RND_DEPARTMENTS,
  SPONSORS_DATABASE,
  createInitialGameState,
  generateDriverAIResponse,
  calculateLapTime
};

// Slash Commands Definition
const commands = [
  { name: 'calendar', description: 'View the 24-race F1 calendar with track details' },
  { name: 'team', description: 'Create and view your F1 team with budget and lineup' },
  { name: 'driver', description: 'Search drivers across F1, F2, F3, F4 and negotiate' },
  { name: 'negotiate', description: 'Sponsor and driver negotiation meetings' },
  { name: 'upgrade', description: 'Open R&D Lobby to research car parts with RP' },
  { name: 'race', description: 'Start Race Weekend (FP1, FP2, FP3, Quali, Race)' }
];

if (process.env.DISCORD_BOT_TOKEN) {
  client.login(process.env.DISCORD_BOT_TOKEN);
   }
