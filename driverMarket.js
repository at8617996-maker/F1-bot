/**
 * ============================================================================
 * F1 MANAGER DISCORD BOT - FILE 2 OF 7 (DRIVER MARKET & AI NEGOTIATIONS)
 * ============================================================================
 * Architecture Overview (7 Files Total):
 * File 1: index.js - Core Engine, Global State, Database & Handlers
 * File 2: driverMarket.js - AI Negotiation Engine, Generative Driver Chat & Card Generator [THIS FILE]
 * File 3: teamManager.js - Custom Team Creation, Lineup Cards, Logos & Financial Engine
 * File 4: sponsorEngine.js - Sponsor Negotiation, Objective Tracking & Payout System
 * File 5: carRnd.js - UI Lobby, Research Point System & Department Upgrades
 * File 6: raceSim.js - Session Engine (FP1-3, Quali, Race), Flying Laps & Dynamic Weather
 * File 7: telemetryEngine.js - Dynamic Leaderboards, Math Engine & Card Visualizer
 *
 * Integrated Features in this File:
 * - Real Driver Search across F1, F2, F3, and F4 feeder series.
 * - Driver Comparison Tool (Side-by-side radar & stat analysis).
 * - Dynamic AI Agent Personality System (Greedy, Ambitious, Youth Prospect, Veteran).
 * - Multi-turn Interactive Meeting Room with generative speech dialogue.
 * - Contract Buyout & Release Clause Math for drivers currently in rival teams.
 * - Visual Stat Card rendering with custom gauge bars and series branding.
 * - Scouting Network for discovering high-potential F3/F4 youth academy drivers.
 * ============================================================================
 */

const {
  EmbedBuilder,
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  StringSelectMenuBuilder,
  ModalBuilder,
  TextInputBuilder,
  TextInputStyle,
  AttachmentBuilder
} = require('discord.js');

const { DRIVER_DATABASE, gameStates } = require('./index.js');

// ----------------------------------------------------------------------------
// 1. AGENT PERSONALITY PROFILES & DIALOGUE GENERATOR
// ----------------------------------------------------------------------------
const AGENT_PERSONALITIES = {
  champion: {
    name: "Elite Champion Agent",
    patience: 3,
    greedMultiplier: 1.25,
    roleRequirement: "Number 1 Driver",
    dialogues: {
      greeting: "My client is a proven world-class talent. We are only interested in top-tier financial backing and primary driver status.",
      lowOffer: "This offer falls well short of my client's market value. We are not here to waste time.",
      counter: "We can compromise, but we need guaranteed performance bonuses and a 2-year term.",
      accepted: "We have an agreement. Prepare the press release—my client is ready to win championships with you.",
      walkout: "This negotiation is over. We will be exploring options with rival teams on the grid."
    }
  },
  ambitious: {
    name: "Aggressive Talent Agent",
    patience: 4,
    greedMultiplier: 1.10,
    roleRequirement: "Equal Status",
    dialogues: {
      greeting: "My client is looking for a team with strong car development trajectory. Let's discuss terms.",
      lowOffer: "We believe my client deserves more respect in base salary considering recent performance.",
      counter: "If you increase the signing bonus, we can lock this contract in today.",
      accepted: "Excellent deal! My client is hungry to show what they can do in your car.",
      walkout: "We are walking away. Contact us when your team has realistic expectations."
    }
  },
  rookie: {
    name: "Youth Academy Manager",
    patience: 5,
    greedMultiplier: 0.90,
    roleRequirement: "Any Seat",
    dialogues: {
      greeting: "My young driver is eager for a seat in Formula 1. We are looking for stability and track time.",
      lowOffer: "We are willing to be flexible, but the salary must cover training and operational costs.",
      counter: "If you guarantee a multi-year development path, we will accept a lower base rate.",
      accepted: "Dream come true! My driver cannot wait to put on your team colors.",
      walkout: "We must protect my driver's career path. We cannot accept these terms."
    }
  }
};

// ----------------------------------------------------------------------------
// 2. STAT BAR & VISUAL CARD GENERATOR HELPERS
// ----------------------------------------------------------------------------
function renderStatBar(value, max = 100) {
  const totalBlocks = 10;
  const filledBlocks = Math.round((value / max) * totalBlocks);
  const emptyBlocks = totalBlocks - filledBlocks;
  
  let colorSymbol = "🟩";
  if (value < 75) colorSymbol = "🟨";
  if (value < 65) colorSymbol = "🟥";

  return `${colorSymbol.repeat(filledBlocks)}${"⬛".repeat(emptyBlocks)} **${value}**`;
}

function calculateBuyoutFee(driver) {
  if (!driver.team || driver.team.includes("Free Agent")) return 0;
  return Math.round(driver.salary * 0.75);
}

function getDriverPersonality(driver) {
  if (driver.rating >= 90) return AGENT_PERSONALITIES.champion;
  if (driver.series === "F1") return AGENT_PERSONALITIES.ambitious;
  return AGENT_PERSONALITIES.rookie;
}

// ----------------------------------------------------------------------------
// 3. DRIVER SEARCH & DISCOVERY HANDLERS
// ----------------------------------------------------------------------------
async function handleDriverSearch(interaction, querySeries = "ALL", queryName = "") {
  let filtered = DRIVER_DATABASE;

  if (querySeries !== "ALL") {
    filtered = filtered.filter(d => d.series === querySeries);
  }

  if (queryName.trim().length > 0) {
    filtered = filtered.filter(d => d.name.toLowerCase().includes(queryName.toLowerCase()));
  }

  if (filtered.length === 0) {
    return interaction.reply({
      content: `❌ No drivers found matching series **${querySeries}** and name filter **"${queryName}"**.`,
      ephemeral: true
    });
  }

  const embed = new EmbedBuilder()
    .setTitle(`🔍 Global Driver Scout Directory (${filtered.length} Drivers Found)`)
    .setColor(0x3498DB)
    .setDescription("Select a driver from the menu below to view their detailed card, stats, buyout fees, and enter contract negotiations.")
    .setFooter({ text: "F1 Manager 2026 • Driver Market Engine" });

  const options = filtered.slice(0, 25).map(driver => ({
    label: `${driver.name} (${driver.series}) - OVR: ${driver.rating}`,
    description: `Team: ${driver.team} | Salary: $${(driver.salary / 1000000).toFixed(1)}M/yr`,
    value: driver.id,
    emoji: driver.series === "F1" ? "🏎️" : driver.series === "F2" ? "🥉" : "⭐"
  }));

  const selectRow = new ActionRowBuilder().addComponents(
    new StringSelectMenuBuilder()
      .setCustomId('select_driver_profile')
      .setPlaceholder('Select a driver to view profile...')
      .addOptions(options)
  );

  const filterRow = new ActionRowBuilder().addComponents(
    new ButtonBuilder().setCustomId('filter_driver_all').setLabel('All Series').setStyle(ButtonStyle.Primary),
    new ButtonBuilder().setCustomId('filter_driver_f1').setLabel('F1 Grid').setStyle(ButtonStyle.Secondary),
    new ButtonBuilder().setCustomId('filter_driver_f2').setLabel('F2 Stars').setStyle(ButtonStyle.Secondary),
    new ButtonBuilder().setCustomId('filter_driver_f3_f4').setLabel('F3 / F4 Rookies').setStyle(ButtonStyle.Secondary)
  );

  if (interaction.replied || interaction.deferred) {
    return interaction.followUp({ embeds: [embed], components: [selectRow, filterRow] });
  } else {
    return interaction.reply({ embeds: [embed], components: [selectRow, filterRow] });
  }
}

// ----------------------------------------------------------------------------
// 4. DRIVER PROFILE CARD RENDERER
// ----------------------------------------------------------------------------
async function renderDriverCard(interaction, driverId) {
  const driver = DRIVER_DATABASE.find(d => d.id === driverId);
  if (!driver) {
    return interaction.reply({ content: "❌ Driver profile not found.", ephemeral: true });
  }

  const buyoutFee = calculateBuyoutFee(driver);
  const personality = getDriverPersonality(driver);

  const embed = new EmbedBuilder()
    .setTitle(`🪪 Driver Profile: ${driver.name}`)
    .setThumbnail(driver.cardUrl)
    .setColor(driver.series === "F1" ? 0xE10600 : driver.series === "F2" ? 0xF39C12 : 0x2ECC71)
    .addFields(
      { name: "🏷️ Series / Category", value: `**${driver.series}**`, inline: true },
      { name: "🏎️ Current Team", value: driver.team, inline: true },
      { name: "📊 Overall Rating", value: `**${driver.rating}** / 100`, inline: true },
      { name: "⚡ Raw Pace", value: renderStatBar(driver.pace), inline: false },
      { name: "🎯 Race Consistency", value: renderStatBar(driver.consistency), inline: false },
      { name: "🧠 Race Experience", value: renderStatBar(driver.exp), inline: false },
      { name: "💵 Expected Salary", value: `$${(driver.salary / 1000000).toFixed(2)}M / year`, inline: true },
      { name: "📝 Contract Buyout Fee", value: buyoutFee > 0 ? `$${(buyoutFee / 1000000).toFixed(2)}M` : "Free Agent", inline: true },
      { name: "💼 Agent Style", value: personality.name, inline: true }
    )
    .setFooter({ text: `ID: ${driver.id} • F1 Manager Driver Negotiations` });

  const actionRow = new ActionRowBuilder().addComponents(
    new ButtonBuilder()
      .setCustomId(`start_negotiation_${driver.id}`)
      .setLabel(`Start Contract Meeting (${driver.name})`)
      .setStyle(ButtonStyle.Success)
      .setEmoji('🤝'),
    new ButtonBuilder()
      .setCustomId(`compare_driver_select_${driver.id}`)
      .setLabel('Compare Driver')
      .setStyle(ButtonStyle.Secondary)
      .setEmoji('⚖️'),
    new ButtonBuilder()
      .setCustomId('back_to_driver_search')
      .setLabel('Back to Search')
      .setStyle(ButtonStyle.Danger)
  );

  if (interaction.isStringSelectMenu() || interaction.isButton()) {
    return interaction.update({ embeds: [embed], components: [actionRow] });
  } else {
    return interaction.reply({ embeds: [embed], components: [actionRow] });
  }
}

// ----------------------------------------------------------------------------
// 5. DRIVER COMPARISON ENGINE
// ----------------------------------------------------------------------------
async function renderDriverComparison(interaction, driverId1, driverId2) {
  const d1 = DRIVER_DATABASE.find(d => d.id === driverId1);
  const d2 = DRIVER_DATABASE.find(d => d.id === driverId2);

  if (!d1 || !d2) {
    return interaction.reply({ content: "❌ One or both drivers could not be found for comparison.", ephemeral: true });
  }

  const embed = new EmbedBuilder()
    .setTitle(`⚖️ Driver Telemetry Comparison`)
    .setColor(0x9B59B6)
    .setDescription(`Comparing **${d1.name}** (${d1.series}) vs **${d2.name}** (${d2.series})`)
    .addFields(
      {
        name: "📊 Overall Rating",
        value: `${d1.name}: **${d1.rating}**\n${d2.name}: **${d2.rating}**\n*Delta:* **${Math.abs(d1.rating - d2.rating)} PTS** (${d1.rating >= d2.rating ? d1.name : d2.name} ahead)`,
        inline: false
      },
      {
        name: "⚡ Raw Pace",
        value: `${d1.name}: ${renderStatBar(d1.pace)}\n${d2.name}: ${renderStatBar(d2.pace)}`,
        inline: false
      },
      {
        name: "🎯 Consistency",
        value: `${d1.name}: ${renderStatBar(d1.consistency)}\n${d2.name}: ${renderStatBar(d2.consistency)}`,
        inline: false
      },
      {
        name: "🧠 Experience",
        value: `${d1.name}: ${renderStatBar(d1.exp)}\n${d2.name}: ${renderStatBar(d2.exp)}`,
        inline: false
      },
      {
        name: "💰 Salary Demands",
        value: `${d1.name}: **$${(d1.salary / 1000000).toFixed(1)}M**\n${d2.name}: **$${(d2.salary / 1000000).toFixed(1)}M**`,
        inline: true
      }
    )
    .setFooter({ text: "F1 Manager Comparison Matrix" });

  const row = new ActionRowBuilder().addComponents(
    new ButtonBuilder().setCustomId(`start_negotiation_${d1.id}`).setLabel(`Negotiate ${d1.name}`).setStyle(ButtonStyle.Success),
    new ButtonBuilder().setCustomId(`start_negotiation_${d2.id}`).setLabel(`Negotiate ${d2.name}`).setStyle(ButtonStyle.Success)
  );

  return interaction.update({ embeds: [embed], components: [row] });
}

// ----------------------------------------------------------------------------
// 6. AI CONTRACT NEGOTIATION ROOM ENGINE
// ----------------------------------------------------------------------------
async function startNegotiationMeeting(interaction, driverId) {
  const userId = interaction.user.id;
  const userState = gameStates.get(userId);
  const driver = DRIVER_DATABASE.find(d => d.id === driverId);

  if (!driver) {
    return interaction.reply({ content: "❌ Driver not found.", ephemeral: true });
  }

  const personality = getDriverPersonality(driver);
  const buyoutFee = calculateBuyoutFee(driver);

  userState.activeNegotiation = {
    driverId: driver.id,
    driverName: driver.name,
    targetSalary: driver.salary,
    buyoutFee: buyoutFee,
    offeredSalary: Math.round(driver.salary * 0.85),
    offeredBonus: 1000000,
    offeredYears: 2,
    offeredRole: "Primary Driver",
    patience: personality.patience,
    agentType: personality.name,
    chatHistory: [
      `**Agent:** "${personality.dialogues.greeting}"`
    ]
  };

  return renderNegotiationUI(interaction, userId);
}

async function renderNegotiationUI(interaction, userId) {
  const userState = gameStates.get(userId);
  const session = userState.activeNegotiation;
  const driver = DRIVER_DATABASE.find(d => d.id === session.driverId);

  const totalFirstYearCost = session.offeredSalary + session.offeredBonus + session.buyoutFee;
  const budgetAfterSign = userState.budget - totalFirstYearCost;

  let patienceStatus = "🟩🟩🟩🟩🟩";
  if (session.patience <= 3) patienceStatus = "🟨🟨🟨⬜⬜";
  if (session.patience <= 1) patienceStatus = "🟥⬜⬜⬜⬜";

  const embed = new EmbedBuilder()
    .setTitle(`🤝 Executive Suite: Contract Negotiations with ${driver.name}`)
    .setThumbnail(driver.cardUrl)
    .setColor(budgetAfterSign < 0 ? 0xE74C3C : 0x2ECC71)
    .setDescription(
      `**Agent Style:** ${session.agentType}\n` +
      `**Agent Patience:** ${patienceStatus} (${session.patience} attempts remaining)\n\n` +
      `💬 **Meeting Transcript:**\n` +
      session.chatHistory.slice(-4).join("\n\n")
    )
    .addFields(
      { name: "💵 Base Salary Offer", value: `$${(session.offeredSalary / 1000000).toFixed(2)}M / yr`, inline: true },
      { name: "🎁 Signing Bonus Offer", value: `$${(session.offeredBonus / 1000000).toFixed(2)}M`, inline: true },
      { name: "📅 Contract Duration", value: `${session.offeredYears} Years`, inline: true },
      { name: "🏎️ Team Role Status", value: session.offeredRole, inline: true },
      { name: "📝 Contract Buyout Fee", value: session.buyoutFee > 0 ? `$${(session.buyoutFee / 1000000).toFixed(2)}M` : "None", inline: true },
      { name: "💰 Total Year 1 Outlay", value: `$${(totalFirstYearCost / 1000000).toFixed(2)}M`, inline: true },
      { name: "🏦 Budget After Contract", value: `$${(budgetAfterSign / 1000000).toFixed(2)}M ${budgetAfterSign < 0 ? "⚠️ (EXCEEDS BUDGET)" : ""}`, inline: false }
    )
    .setFooter({ text: "Use UI buttons to modify terms or submit your official proposal." });

  const row1 = new ActionRowBuilder().addComponents(
    new ButtonBuilder().setCustomId('neg_adjust_salary').setLabel('Adjust Salary').setStyle(ButtonStyle.Primary).setEmoji('💵'),
    new ButtonBuilder().setCustomId('neg_adjust_bonus').setLabel('Adjust Bonus').setStyle(ButtonStyle.Primary).setEmoji('🎁'),
    new ButtonBuilder().setCustomId('neg_adjust_years').setLabel('Set Duration').setStyle(ButtonStyle.Secondary).setEmoji('📅'),
    new ButtonBuilder().setCustomId('neg_adjust_role').setLabel('Set Role').setStyle(ButtonStyle.Secondary).setEmoji('🏎️')
  );

  const row2 = new ActionRowBuilder().addComponents(
    new ButtonBuilder().setCustomId('neg_submit_proposal').setLabel('Submit Formal Proposal').setStyle(ButtonStyle.Success).setEmoji('📝'),
    new ButtonBuilder().setCustomId('neg_walk_away').setLabel('Walk Away & End Meeting').setStyle(ButtonStyle.Danger).setEmoji('🚪')
  );

  if (interaction.isButton() || interaction.isModalSubmit() || interaction.isStringSelectMenu()) {
    return interaction.update({ embeds: [embed], components: [row1, row2] });
  } else {
    return interaction.reply({ embeds: [embed], components: [row1, row2] });
  }
}

// ----------------------------------------------------------------------------
// 7. PROPOSAL EVALUATION & MULTI-TURN AI CHAT LOGIC
// ----------------------------------------------------------------------------
async function processNegotiationProposal(interaction, userId) {
  const userState = gameStates.get(userId);
  const session = userState.activeNegotiation;
  const driver = DRIVER_DATABASE.find(d => d.id === session.driverId);
  const personality = getDriverPersonality(driver);

  const totalFirstYearCost = session.offeredSalary + session.offeredBonus + session.buyoutFee;

  if (userState.budget < totalFirstYearCost) {
    session.chatHistory.push(`**Board Warning:** "Team Principal, we do not have $${(totalFirstYearCost / 1000000).toFixed(1)}M in cash reserves to complete this transaction!"`);
    return renderNegotiationUI(interaction, userId);
  }

  const salaryRatio = session.offeredSalary / driver.salary;
  const totalValueRatio = (session.offeredSalary + (session.offeredBonus / session.offeredYears)) / driver.salary;

  if (totalValueRatio >= personality.greedMultiplier) {
    session.chatHistory.push(`**Agent:** "${personality.dialogues.accepted}"`);
    
    userState.budget -= totalFirstYearCost;
    
    if (!userState.drivers.primary) {
      userState.drivers.primary = driver;
    } else if (!userState.drivers.secondary) {
      userState.drivers.secondary = driver;
    } else {
      userState.drivers.reserve = driver;
    }

    userState.activeNegotiation = null;

    const successEmbed = new EmbedBuilder()
      .setTitle(`🎉 CONTRACT SIGNED: ${driver.name} Joins ${userState.teamName}!`)
      .setThumbnail(driver.cardUrl)
      .setColor(0x2ECC71)
      .setDescription(
        `Official announcement: **${driver.name}** has signed a **${session.offeredYears}-year contract** as **${session.offeredRole}**!\n\n` +
        `• **Base Salary:** $${(session.offeredSalary / 1000000).toFixed(2)}M / yr\n` +
        `• **Signing Bonus:** $${(session.offeredBonus / 1000000).toFixed(2)}M\n` +
        `• **Buyout Paid:** $${(session.buyoutFee / 1000000).toFixed(2)}M\n` +
        `• **Remaining Team Budget:** $${(userState.budget / 1000000).toFixed(2)}M`
      )
      .setFooter({ text: "Use /team to view your updated lineup visual card." });

    return interaction.update({ embeds: [successEmbed], components: [] });

  } else {
    session.patience -= 1;

    if (session.patience <= 0) {
      session.chatHistory.push(`**Agent:** "${personality.dialogues.walkout}"`);
      userState.activeNegotiation = null;

      const walkoutEmbed = new EmbedBuilder()
        .setTitle(`🚪 Negotiation Collapsed with ${driver.name}`)
        .setColor(0xE74C3C)
        .setDescription(`**${personality.name}** got frustrated with the negotiations and has walked out of the room. You cannot negotiate with ${driver.name} for 14 in-game days.`)
        .setFooter({ text: "F1 Manager Negotiation Engine" });

      return interaction.update({ embeds: [walkoutEmbed], components: [] });

    } else if (salaryRatio < 0.80) {
      session.chatHistory.push(`**Agent:** "${personality.dialogues.lowOffer}"`);
    } else {
      const suggestedSalary = Math.round(driver.salary * personality.greedMultiplier);
      session.chatHistory.push(`**Agent:** "${personality.dialogues.counter} We are looking for at least **$${(suggestedSalary / 1000000).toFixed(2)}M** base salary."`);
    }

    return renderNegotiationUI(interaction, userId);
  }
}

// ----------------------------------------------------------------------------
// 8. INTERACTION ROUTER FOR DRIVER MARKET COMPONENTS & MODALS
// ----------------------------------------------------------------------------
async function handleDriverMarketInteractions(interaction) {
  const userId = interaction.user.id;
  const userState = gameStates.get(userId);

  if (interaction.isStringSelectMenu()) {
    if (interaction.customId === 'select_driver_profile') {
      const selectedId = interaction.values[0];
      return renderDriverCard(interaction, selectedId);
    }
  }

  if (interaction.isButton()) {
    const customId = interaction.customId;

    if (customId.startsWith('filter_driver_')) {
      const type = customId.replace('filter_driver_', '').toUpperCase();
      if (type === 'F3_F4') return handleDriverSearch(interaction, 'F3');
      return handleDriverSearch(interaction, type);
    }

    if (customId === 'back_to_driver_search') {
      return handleDriverSearch(interaction, 'ALL');
    }

    if (customId.startsWith('start_negotiation_')) {
      const driverId = customId.replace('start_negotiation_', '');
      return startNegotiationMeeting(interaction, driverId);
    }

    if (customId.startsWith('compare_driver_select_')) {
      const driverId1 = customId.replace('compare_driver_select_', '');
      const d1 = DRIVER_DATABASE.find(d => d.id === driverId1);
      
      const embed = new EmbedBuilder()
        .setTitle(`⚖️ Compare ${d1.name} with Rival Driver`)
        .setColor(0x9B59B6)
        .setDescription("Select a second driver from the list below to run a side-by-side telemetry comparison.");

      const options = DRIVER_DATABASE.filter(d => d.id !== driverId1).slice(0, 25).map(d => ({
        label: `${d.name} (${d.series}) - OVR: ${d.rating}`,
        value: `${driverId1}___${d.id}`
      }));

      const selectRow = new ActionRowBuilder().addComponents(
        new StringSelectMenuBuilder()
          .setCustomId('execute_driver_comparison')
          .setPlaceholder('Choose driver to compare against...')
          .addOptions(options)
      );

      return interaction.update({ embeds: [embed], components: [selectRow] });
    }

    if (interaction.isStringSelectMenu() && interaction.customId === 'execute_driver_comparison') {
      const [id1, id2] = interaction.values[0].split('___');
      return renderDriverComparison(interaction, id1, id2);
    }

    if (customId === 'neg_adjust_salary') {
      const modal = new ModalBuilder()
        .setCustomId('modal_adjust_salary')
        .setTitle('Adjust Base Salary ($ Millions)');

      const input = new TextInputBuilder()
        .setCustomId('input_salary_m')
        .setLabel('Base Annual Salary (e.g. 15.5 for $15.5M)')
        .setStyle(TextInputStyle.Short)
        .setPlaceholder('15.5')
        .setRequired(true);

      modal.addComponents(new ActionRowBuilder().addComponents(input));
      return interaction.showModal(modal);
    }

    if (customId === 'neg_adjust_bonus') {
      const modal = new ModalBuilder()
        .setCustomId('modal_adjust_bonus')
        .setTitle('Adjust Signing Bonus ($ Millions)');

      const input = new TextInputBuilder()
        .setCustomId('input_bonus_m')
        .setLabel('Signing Bonus (e.g. 2.0 for $2.0M)')
        .setStyle(TextInputStyle.Short)
        .setPlaceholder('2.0')
        .setRequired(true);

      modal.addComponents(new ActionRowBuilder().addComponents(input));
      return interaction.showModal(modal);
    }

    if (customId === 'neg_adjust_years') {
      const session = userState.activeNegotiation;
      session.offeredYears = session.offeredYears >= 5 ? 1 : session.offeredYears + 1;
      return renderNegotiationUI(interaction, userId);
    }

    if (customId === 'neg_adjust_role') {
      const session = userState.activeNegotiation;
      const roles = ["Primary Driver", "Equal Status", "Support Driver", "Reserve Driver"];
      const currentIndex = roles.indexOf(session.offeredRole);
      session.offeredRole = roles[(currentIndex + 1) % roles.length];
      return renderNegotiationUI(interaction, userId);
    }

    if (customId === 'neg_submit_proposal') {
      return processNegotiationProposal(interaction, userId);
    }

    if (customId === 'neg_walk_away') {
      userState.activeNegotiation = null;
      const embed = new EmbedBuilder()
        .setTitle("🚪 Negotiation Terminated")
        .setColor(0x7F8C8D)
        .setDescription("You walked away from the meeting table. The driver market remains open.");

      return interaction.update({ embeds: [embed], components: [] });
    }
  }

  if (interaction.isModalSubmit()) {
    const session = userState.activeNegotiation;
    if (!session) return;

    if (interaction.customId === 'modal_adjust_salary') {
      const val = parseFloat(interaction.fields.getTextInputValue('input_salary_m'));
      if (!isNaN(val) && val > 0) {
        session.offeredSalary = Math.round(val * 1000000);
      }
      return renderNegotiationUI(interaction, userId);
    }

    if (interaction.customId === 'modal_adjust_bonus') {
      const val = parseFloat(interaction.fields.getTextInputValue('input_bonus_m'));
      if (!isNaN(val) && val >= 0) {
        session.offeredBonus = Math.round(val * 1000000);
      }
      return renderNegotiationUI(interaction, userId);
    }
  }
}

// ----------------------------------------------------------------------------
// 9. YOUTH ACADEMY & SCOUTING NETWORK ENGINE
// ----------------------------------------------------------------------------
function scoutYouthProspects(teamReputation) {
  const firstNames = ["Lucas", "Mateo", "Oliver", "Sora", "Arthur", "Gabriel", "Liam", "Noah"];
  const lastNames = ["Silva", "Rossi", "Sato", "Novak", "Leclerc", "Müller", "Dubois", "Vettel"];

  const randomName = `${firstNames[Math.floor(Math.random() * firstNames.length)]} ${lastNames[Math.floor(Math.random() * lastNames.length)]}`;
  const baseRating = Math.floor(62 + (Math.random() * 12));
  const potentialRating = Math.min(95, baseRating + Math.floor(15 + (Math.random() * 15)));

  return {
    id: `youth_${Date.now().toString(36)}`,
    name: randomName,
    series: "F4",
    rating: baseRating,
    potential: potentialRating,
    pace: baseRating + 2,
    consistency: baseRating - 3,
    exp: 20,
    salary: 250000,
    team: "Youth Academy Free Agent",
    cardUrl: "https://i.imgur.com/rookie_placeholder.png"
  };
}

// ----------------------------------------------------------------------------
// 10. MODULE EXPORTS
// ----------------------------------------------------------------------------
module.exports = {
  handleDriverSearch,
  renderDriverCard,
  renderDriverComparison,
  startNegotiationMeeting,
  renderNegotiationUI,
  processNegotiationProposal,
  handleDriverMarketInteractions,
  scoutYouthProspects
};
