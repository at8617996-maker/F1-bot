/**
 * ============================================================================
 * F1 MANAGER DISCORD BOT - FILE 5 OF 7 (CAR R&D & DEPARTMENT UPGRADES)
 * ============================================================================
 * Architecture Overview (7 Files Total):
 * File 1: index.js - Core Engine, Global State, Database & Handlers
 * File 2: driverMarket.js - AI Negotiation Engine & Generative Chat
 * File 3: teamManager.js - FC26 Style Card Generator, Lineup UI & Finances
 * File 4: sponsorEngine.js - Sponsor Negotiation, Objective Tracking & Payout System
 * File 5: carRnd.js - UI Lobby, Research Point System & Department Upgrades [THIS FILE]
 * File 6: raceSim.js - Session Engine (FP1-3, Quali, Race), Flying Laps & Dynamic Weather
 * File 7: telemetryEngine.js - Dynamic Leaderboards, Math Engine & Card Visualizer
 *
 * Integrated Features in this File:
 * - Car Performance Attributes (Aerodynamics, Chassis, Engine Power, Reliability).
 * - Research & Development (R&D) Point generation system.
 * - Department upgrade mechanics (Wind Tunnel, CFD, Powertrain Testbench, Simulator).
 * - Interactive R&D Hub UI with Department Status and Upgrade triggers.
 * ============================================================================
 */

const { EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle, StringSelectMenuBuilder } = require('discord.js');
const { gameStates } = require('./index.js');

// ----------------------------------------------------------------------------
// 1. CAR PERFORMANCE & DEPARTMENT DEFINITIONS
// ----------------------------------------------------------------------------
const RND_DEPARTMENTS = [
  {
    id: 'aero',
    name: 'Aerodynamics Wind Tunnel',
    description: 'Improves high-speed cornering and overall downforce generation.',
    cost: 4500000,
    rpCost: 350,
    statBoost: 3.5,
    icon: '💨'
  },
  {
    id: 'chassis',
    name: 'Chassis & Suspension Lab',
    description: 'Enhances mechanical grip, tire wear management, and low-speed agility.',
    cost: 4000000,
    rpCost: 300,
    statBoost: 3.0,
    icon: '🏗️'
  },
  {
    id: 'engine',
    name: 'Powertrain & ICE Testbench',
    description: 'Boosts top speed on straightaways and energy recovery deployment.',
    cost: 5500000,
    rpCost: 400,
    statBoost: 4.0,
    icon: '⚡'
  },
  {
    id: 'reliability',
    name: 'Quality Control & Cooling',
    description: 'Reduces mechanical DNF risks and engine thermal degradation.',
    cost: 3000000,
    rpCost: 200,
    statBoost: 2.5,
    icon: '🛡️'
  }
];

// ----------------------------------------------------------------------------
// 2. R&D POINT GENERATION & CAR STAT CALCULATOR
// ----------------------------------------------------------------------------
const RND_ENGINE = {
  // Generate research points after completing a session or race
  generatePoints: function(userState, sessionPosition) {
    let baseRP = 150;
    // Better positions yield more research data
    if (sessionPosition <= 3) baseRP += 150;
    else if (sessionPosition <= 10) baseRP += 80;

    // Scale by facility level
    const facilityMultiplier = 1 + ((userState.upgradesInstalled || []).length * 0.15);
    const earnedRP = Math.round(baseRP * facilityMultiplier);

    if (!userState.researchPoints) userState.researchPoints = 0;
    userState.researchPoints += earnedRP;

    return earnedRP;
  },

  // Upgrade car department
  upgradeDepartment: function(userState, deptId) {
    const dept = RND_DEPARTMENTS.find(d => d.id === deptId);
    if (!dept) return { success: false, message: "Department not found." };

    if (!userState.researchPoints) userState.researchPoints = 0;
    if (!userState.carStats) {
      userState.carStats = { aero: 65, chassis: 65, engine: 65, reliability: 70 };
    }

    if (userState.budget < dept.cost) {
      return { success: false, message: `Insufficient funds! Required: $${(dept.cost / 1000000).toFixed(1)}M.` };
    }

    if (userState.researchPoints < dept.rpCost) {
      return { success: false, message: `Insufficient Research Points! Required: ${dept.rpCost} RP.` };
    }

    // Deduct resources
    userState.budget -= dept.cost;
    userState.researchPoints -= dept.rpCost;

    // Boost car stat
    userState.carStats[deptId] = Math.min(99, +(userState.carStats[deptId] + dept.statBoost).toFixed(1));

    // Record installation
    if (!userState.upgradesInstalled) userState.upgradesInstalled = [];
    userState.upgradesInstalled.push({ deptId: dept.id, name: dept.name, timestamp: Date.now() });

    return {
      success: true,
      newStat: userState.carStats[deptId],
      remainingBudget: userState.budget,
      remainingRP: userState.researchPoints
    };
  }
};

// ----------------------------------------------------------------------------
// 3. R&D HUB UI RENDERER
// ----------------------------------------------------------------------------
async function renderRndHub(interaction) {
  const userId = interaction.user.id;
  const userState = gameStates.get(userId);

  if (!userState) {
    return interaction.reply({ content: "❌ You have not created a team yet! Use `/team`.", ephemeral: true });
  }

  if (!userState.carStats) {
    userState.carStats = { aero: 65, chassis: 65, engine: 65, reliability: 70 };
  }
  if (!userState.researchPoints) {
    userState.researchPoints = 250; // Starter research points
  }

  const stats = userState.carStats;
  const overallCarRating = Math.round((stats.aero + stats.chassis + stats.engine + stats.reliability) / 4);

  const embed = new EmbedBuilder()
    .setTitle(`🔬 R&D & Technical Headquarters: ${userState.teamName}`)
    .setColor(0xE74C3C)
    .setDescription(
      `Upgrade your car performance packages to gain a competitive edge on race day.\n\n` +
      `🏎️ **Car Overall Performance Index:** **${overallCarRating} / 99**\n` +
      `🧪 **Available Research Points (RP):** **${userState.researchPoints} RP**\n` +
      `💵 **Operating Budget:** **$${(userState.budget / 1000000).toFixed(2)}M**`
    )
    .addFields(
      { name: "💨 Aerodynamics", value: `Level: **${stats.aero}**`, inline: true },
      { name: "🏗️ Chassis & Grip", value: `Level: **${stats.chassis}**`, inline: true },
      { name: "⚡ Engine Power", value: `Level: **${stats.engine}**`, inline: true },
      { name: "🛡️ Reliability", value: `Level: **${stats.reliability}**`, inline: true }
    )
    .setFooter({ text: "F1 Manager Technical Regulations • Select a department upgrade below" });

  const selectOptions = RND_DEPARTMENTS.map(dept => ({
    label: `${dept.icon} ${dept.name}`,
    description: `Cost: $${(dept.cost / 1000000).toFixed(1)}M | RP: ${dept.rpCost} | +${dept.statBoost} Stat`,
    value: `rnd_upgrade_${dept.id}`
  }));

  const selectRow = new ActionRowBuilder().addComponents(
    new StringSelectMenuBuilder()
      .setCustomId('select_rnd_department')
      .setPlaceholder('Select department upgrade project...')
      .addOptions(selectOptions)
  );

  const buttonRow = new ActionRowBuilder().addComponents(
    new ButtonBuilder().setCustomId('rnd_refresh_hub').setLabel('Refresh Telemetry').setStyle(ButtonStyle.Primary).setEmoji('🔄'),
    new ButtonBuilder().setCustomId('rnd_back_menu').setLabel('Back to Main Menu').setStyle(ButtonStyle.Secondary)
  );

  if (interaction.isButton() || interaction.isStringSelectMenu()) {
    return interaction.update({ embeds: [embed], components: [selectRow, buttonRow] });
  } else {
    return interaction.reply({ embeds: [embed], components: [selectRow, buttonRow], ephemeral: true });
  }
}

// ----------------------------------------------------------------------------
// 4. INTERACTION HANDLERS FOR CAR R&D
// ----------------------------------------------------------------------------
async function handleRndInteractions(interaction) {
  const userId = interaction.user.id;
  const userState = gameStates.get(userId);

  if (!userState) {
    return interaction.reply({ content: "❌ Team state not found.", ephemeral: true });
  }

  if (interaction.isStringSelectMenu() && interaction.customId === 'select_rnd_department') {
    const selectedValue = interaction.values[0];
    const deptId = selectedValue.replace('rnd_upgrade_', '');
    
    const result = RND_ENGINE.upgradeDepartment(userState, deptId);

    if (!result.success) {
      return interaction.reply({ content: `❌ **Upgrade Failed:** ${result.message}`, ephemeral: true });
    }

    const dept = RND_DEPARTMENTS.find(d => d.id === deptId);

    const successEmbed = new EmbedBuilder()
      .setTitle(`🚀 Department Upgrade Successful: ${dept.name}`)
      .setColor(0x2ECC71)
      .setDescription(
        `Successfully manufactured and deployed new upgrade components for **${dept.name}**!\n\n` +
        `• **New Department Stat:** ${result.newStat}\n` +
        `• **Remaining Cash:** $${(result.remainingBudget / 1000000).toFixed(2)}M\n` +
        `• **Remaining RP:** ${result.remainingRP} RP`
      )
      .setFooter({ text: "F1 Manager R&D Division" });

    const backRow = new ActionRowBuilder().addComponents(
      new ButtonBuilder().setCustomId('rnd_refresh_hub').setLabel('Return to R&D Hub').setStyle(ButtonStyle.Success)
    );

    return interaction.update({ embeds: [successEmbed], components: [backRow] });
  }

  if (interaction.isButton()) {
    const customId = interaction.customId;

    if (customId === 'rnd_refresh_hub' || customId === 'rnd_back_menu') {
      return renderRndHub(interaction);
    }
  }
}

// ----------------------------------------------------------------------------
// 5. MODULE EXPORTS
// ----------------------------------------------------------------------------
module.exports = {
  RND_DEPARTMENTS,
  RND_ENGINE,
  renderRndHub,
  handleRndInteractions
};
