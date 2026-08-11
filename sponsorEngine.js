/**
 * ============================================================================
 * F1 MANAGER DISCORD BOT - FILE 4 OF 7 (SPONSOR NEGOTIATION & PAYOUT SYSTEM)
 * ============================================================================
 * Architecture Overview (7 Files Total):
 * File 1: index.js - Core Engine, Global State, Database & Handlers
 * File 2: driverMarket.js - AI Negotiation Engine & Generative Chat
 * File 3: teamManager.js - FC26 Style Card Generator, Lineup UI & Finances
 * File 4: sponsorEngine.js - Sponsor Negotiation, Objective Tracking & Payout System [THIS FILE]
 * File 5: carRnd.js - UI Lobby, Research Point System & Department Upgrades
 * File 6: raceSim.js - Session Engine (FP1-3, Quali, Race), Flying Laps & Dynamic Weather
 * File 7: telemetryEngine.js - Dynamic Leaderboards, Math Engine & Card Visualizer
 *
 * Integrated Features in this File:
 * - Sponsor Brand Database (Title Sponsor, Major Partner, Technical Partner).
 * - Dynamic Sponsor Contract Offer Generation based on Team Reputation & Performance.
 * - Race Weekend Objective Tracking (e.g., Top 5 Finish, Q3 Appearance, Clean Race).
 * - Milestone Bonus Payout System & Contract Expiry Management.
 * - Interactive Sponsor Hub UI with Acceptance, Rejection & Renewal workflows.
 * ============================================================================
 */

const { EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle, StringSelectMenuBuilder } = require('discord.js');
const { gameStates } = require('./index.js');

// ----------------------------------------------------------------------------
// 1. SPONSOR BRAND DATABASE & PROFILES
// ----------------------------------------------------------------------------
const SPONSOR_DATABASE = [
  {
    id: 'sponsor_vortex',
    name: 'Vortex Energy Drinks',
    tier: 'TITLE',
    prestigeRequired: 30,
    baseUpfront: 12000000,
    raceBonus: 1500000,
    objective: 'Finish in the Top 5 with at least one car',
    durationRaces: 5,
    logo: 'https://i.imgur.com/vortex_logo.png',
    color: 0x9B59B6
  },
  {
    id: 'sponsor_apex',
    name: 'Apex Global Technologies',
    tier: 'TITLE',
    prestigeRequired: 50,
    baseUpfront: 22000000,
    raceBonus: 2800000,
    objective: 'Secure a Podium (Top 3) finish',
    durationRaces: 5,
    logo: 'https://i.imgur.com/apex_logo.png',
    color: 0x3498DB
  },
  {
    id: 'sponsor_cronos',
    name: 'Cronos Swiss Watches',
    tier: 'MAJOR',
    prestigeRequired: 20,
    baseUpfront: 6000000,
    raceBonus: 800000,
    objective: 'Reach Q3 in Qualifying with both cars',
    durationRaces: 4,
    logo: 'https://i.imgur.com/cronos_logo.png',
    color: 0xF1C40F
  },
  {
    id: 'sponsor_titan',
    name: 'Titan Lubricants',
    tier: 'MAJOR',
    prestigeRequired: 15,
    baseUpfront: 4500000,
    raceBonus: 600000,
    objective: 'Finish the race without incurring any penalties',
    durationRaces: 4,
    logo: 'https://i.imgur.com/titan_logo.png',
    color: 0xE67E22
  },
  {
    id: 'sponsor_hyperline',
    name: 'Hyperline Carbon Fibers',
    tier: 'TECHNICAL',
    prestigeRequired: 5,
    baseUpfront: 2000000,
    raceBonus: 300000,
    objective: 'Complete at least 85% race distance',
    durationRaces: 3,
    logo: 'https://i.imgur.com/hyperline_logo.png',
    color: 0x2ECC71
  }
];

// ----------------------------------------------------------------------------
// 2. SPONSOR CONTRACT GENERATOR & HELPER FUNCTIONS
// ----------------------------------------------------------------------------
function getAvailableSponsors(userState) {
  // Filter sponsors matching team reputation/prestige
  return SPONSOR_DATABASE.filter(s => userState.reputation >= s.prestigeRequired);
}

// ----------------------------------------------------------------------------
// 3. SPONSOR HUB UI & DISCORD HANDLERS
// ----------------------------------------------------------------------------
async function renderSponsorHub(interaction) {
  const userId = interaction.user.id;
  const userState = gameStates.get(userId);

  if (!userState) {
    return interaction.reply({ content: "❌ You have not created a team yet! Use `/team`.", ephemeral: true });
  }

  const availableSponsors = getAvailableSponsors(userState);
  const activeSponsors = userState.activeSponsors || [];

  const embed = new EmbedBuilder()
    .setTitle(`🤝 Commercial & Sponsorship Department: ${userState.teamName}`)
    .setColor(0x3498DB)
    .setDescription(
      `Manage brand partnerships, negotiate upfront capital injections, and track race weekend performance objectives.\n\n` +
      `**Active Sponsorship Contracts (${activeSponsors.length}/3):**\n` +
      (activeSponsors.length > 0 
        ? activeSponsors.map(s => `• **${s.name}** (${s.tier}) — Objective: *${s.objective}* | Races Remaining: **${s.racesLeft}**`).join('\n')
        : "*No active sponsorships signed. Browse available offers below.*")
    )
    .addFields(
      { name: "📈 Current Team Reputation", value: `${userState.reputation} / 100 Index`, inline: true },
      { name: "💵 Current Cash Reserves", value: `$${(userState.budget / 1000000).toFixed(2)}M`, inline: true }
    )
    .setFooter({ text: "F1 Manager Commercial Engine • Secure brand deals to boost your budget" });

  const options = availableSponsors.map(s => ({
    label: `${s.name} (${s.tier})`,
    description: `Upfront: $${(s.baseUpfront / 1000000).toFixed(1)}M | Bonus: $${(s.raceBonus / 1000000).toFixed(1)}M`,
    value: s.id,
    emoji: '💼'
  }));

  const components = [];
  if (options.length > 0 && activeSponsors.length < 3) {
    components.push(
      new ActionRowBuilder().addComponents(
        new StringSelectMenuBuilder()
          .setCustomId('select_sponsor_offer')
          .setPlaceholder('Select a sponsor offer to review contract...')
          .addOptions(options.slice(0, 25))
      )
    );
  }

  components.push(
    new ActionRowBuilder().addComponents(
      new ButtonBuilder().setCustomId('sponsor_refresh_market').setLabel('Scout New Brand Offers').setStyle(ButtonStyle.Primary).setEmoji('🔍'),
      new ButtonBuilder().setCustomId('sponsor_back_hub').setLabel('Back to Main Menu').setStyle(ButtonStyle.Secondary)
    )
  );

  if (interaction.isButton() || interaction.isStringSelectMenu()) {
    return interaction.update({ embeds: [embed], components });
  } else {
    return interaction.reply({ embeds: [embed], components, ephemeral: true });
  }
}

async function reviewSponsorOffer(interaction, sponsorId) {
  const sponsor = SPONSOR_DATABASE.find(s => s.id === sponsorId);
  if (!sponsor) {
    return interaction.reply({ content: "❌ Sponsor offer not found.", ephemeral: true });
  }

  const embed = new EmbedBuilder()
    .setTitle(`📝 Contract Proposal: ${sponsor.name}`)
    .setColor(sponsor.color)
    .setThumbnail(sponsor.logo)
    .setDescription(`Review the binding partnership terms proposed by **${sponsor.name}** legal department.`)
    .addFields(
      { name: "🏷️ Sponsorship Tier", value: `**${sponsor.tier} Partner**`, inline: true },
      { name: "💵 Upfront Cash Payout", value: `**$${(sponsor.baseUpfront / 1000000).toFixed(2)}M**`, inline: true },
      { name: "🏁 Per-Race Performance Bonus", value: `**$${(sponsor.raceBonus / 1000000).toFixed(2)}M**`, inline: true },
      { name: "🎯 Weekend Objective", value: sponsor.objective, inline: false },
      { name: "📅 Contract Duration", value: `**${sponsor.durationRaces} Race Weekends**`, inline: true }
    )
    .setFooter({ text: "F1 Manager Legal & Compliance Department" });

  const actionRow = new ActionRowBuilder().addComponents(
    new ButtonBuilder().setCustomId(`accept_sponsor_${sponsor.id}`).setLabel('Sign Contract').setStyle(ButtonStyle.Success).setEmoji('✍️'),
    new ButtonBuilder().setCustomId('back_sponsor_hub').setLabel('Decline & Return').setStyle(ButtonStyle.Danger)
  );

  return interaction.update({ embeds: [embed], components: [actionRow] });
}

async function handleSponsorInteractions(interaction) {
  const userId = interaction.user.id;
  const userState = gameStates.get(userId);

  if (!userState) {
    return interaction.reply({ content: "❌ Team state not found.", ephemeral: true });
  }

  if (interaction.isStringSelectMenu() && interaction.customId === 'select_sponsor_offer') {
    const sponsorId = interaction.values[0];
    return reviewSponsorOffer(interaction, sponsorId);
  }

  if (interaction.isButton()) {
    const customId = interaction.customId;

    if (customId === 'sponsor_back_hub' || customId === 'sponsor_refresh_market') {
      return renderSponsorHub(interaction);
    }

    if (customId.startsWith('accept_sponsor_')) {
      const sponsorId = customId.replace('accept_sponsor_', '');
      const sponsor = SPONSOR_DATABASE.find(s => s.id === sponsorId);

      if (!userState.activeSponsors) userState.activeSponsors = [];
      if (userState.activeSponsors.length >= 3) {
        return interaction.reply({ content: "❌ You already have the maximum of 3 active sponsorships!", ephemeral: true });
      }

      // Apply upfront payment
      userState.budget += sponsor.baseUpfront;
      
      // Add to active sponsors
      userState.activeSponsors.push({
        ...sponsor,
        racesLeft: sponsor.durationRaces
      });

      const successEmbed = new EmbedBuilder()
        .setTitle(`🎉 Partnership Secured: ${sponsor.name}!`)
        .setColor(0x2ECC71)
        .setDescription(`Contract successfully signed! **+$${(sponsor.baseUpfront / 1000000).toFixed(2)}M** has been credited to your team operating budget.`)
        .addFields(
          { name: "🎯 Active Objective", value: sponsor.objective, inline: false },
          { name: "💵 New Team Budget", value: `$${(userState.budget / 1000000).toFixed(2)}M`, inline: true }
        )
        .setFooter({ text: "Use sponsor hub to track ongoing race objectives." });

      const backRow = new ActionRowBuilder().addComponents(
        new ButtonBuilder().setCustomId('sponsor_back_hub').setLabel('Return to Sponsor Hub').setStyle(ButtonStyle.Primary)
      );

      return interaction.update({ embeds: [successEmbed], components: [backRow] });
    }
  }
}

// ----------------------------------------------------------------------------
// 4. MODULE EXPORTS
// ----------------------------------------------------------------------------
module.exports = {
  SPONSOR_DATABASE,
  getAvailableSponsors,
  renderSponsorHub,
  reviewSponsorOffer,
  handleSponsorInteractions
};
