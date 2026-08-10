// commands.js
// Slash command definitions + handlers, all replies as embeds, plus a
// button-driven driver market. Import into index.js.

const { SlashCommandBuilder, EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');
const db = require('./database');
const engine = require('./gameEngine');
const driversData = require('./drivers');

const BRAND_COLOR = 0xE10600; // F1 red

function baseEmbed(title) {
  return new EmbedBuilder().setColor(BRAND_COLOR).setTitle(title).setTimestamp();
}

const commands = [
  new SlashCommandBuilder().setName('team-create')
    .setDescription('Create your F1 team')
    .addStringOption(o => o.setName('name').setDescription('Team name').setRequired(true)),

  new SlashCommandBuilder().setName('team-info')
    .setDescription('View your team overview'),

  new SlashCommandBuilder().setName('upgrade-car')
    .setDescription('Spend budget to upgrade a car part')
    .addStringOption(o => o.setName('part').setDescription('aero, engine, or chassis').setRequired(true)
      .addChoices({ name: 'Aero', value: 'aero' }, { name: 'Engine', value: 'engine' }, { name: 'Chassis', value: 'chassis' })),

  new SlashCommandBuilder().setName('wind-tunnel')
    .setDescription('Run wind tunnel research to improve aero'),

  new SlashCommandBuilder().setName('reliability-program')
    .setDescription('Invest in car reliability'),

  new SlashCommandBuilder().setName('upgrade-facility')
    .setDescription('Upgrade a team facility')
    .addStringOption(o => o.setName('facility').setDescription('Facility to upgrade').setRequired(true)
      .addChoices(
        { name: 'Wind Tunnel', value: 'windTunnel' },
        { name: 'Factory', value: 'factory' },
        { name: 'Simulator', value: 'simulator' },
        { name: 'Academy', value: 'academy' }
      )),

  new SlashCommandBuilder().setName('hire-pit-crew')
    .setDescription('Invest in your pit crew skill'),

  new SlashCommandBuilder().setName('train-driver')
    .setDescription('Train a driver to boost skill')
    .addIntegerOption(o => o.setName('driver').setDescription('1 or 2').setRequired(true).addChoices({ name: 'Driver 1', value: 1 }, { name: 'Driver 2', value: 2 })),

  new SlashCommandBuilder().setName('negotiate-contract')
    .setDescription('Extend a driver contract')
    .addIntegerOption(o => o.setName('driver').setDescription('1 or 2').setRequired(true).addChoices({ name: 'Driver 1', value: 1 }, { name: 'Driver 2', value: 2 }))
    .addIntegerOption(o => o.setName('years').setDescription('Number of years').setRequired(true)),

  new SlashCommandBuilder().setName('scout-junior')
    .setDescription('Scout a junior academy driver'),

  new SlashCommandBuilder().setName('promote-junior')
    .setDescription('Promote a junior driver to the race seat')
    .addIntegerOption(o => o.setName('index').setDescription('Junior index (1-based)').setRequired(true))
    .addIntegerOption(o => o.setName('slot').setDescription('1 or 2').setRequired(true).addChoices({ name: 'Driver 1', value: 1 }, { name: 'Driver 2', value: 2 })),

  new SlashCommandBuilder().setName('driver-market')
    .setDescription('Browse real F1 drivers available to sign'),

  new SlashCommandBuilder().setName('negotiate-sponsor')
    .setDescription('Pursue a new sponsorship deal'),

  new SlashCommandBuilder().setName('finance')
    .setDescription('View your financial report'),

  new SlashCommandBuilder().setName('press-conference')
    .setDescription('Hold a press conference'),

  new SlashCommandBuilder().setName('race-weekend')
    .setDescription('Simulate the full race weekend (practice, quali, race)')
    .addStringOption(o => o.setName('strategy').setDescription('Tyre strategy for the race').setRequired(true)
      .addChoices({ name: 'Dry', value: 'Dry' }, { name: 'Wet', value: 'Wet' })),

  new SlashCommandBuilder().setName('standings')
    .setDescription('View the league leaderboard'),

  new SlashCommandBuilder().setName('trophies')
    .setDescription('View your trophy cabinet'),

  new SlashCommandBuilder().setName('calendar')
    .setDescription('View the season calendar and current race'),

  new SlashCommandBuilder().setName('end-season')
    .setDescription('Close out the season, show awards, and reset for next season')
];

function requireTeam(interaction, database) {
  const team = db.getTeam(database, interaction.user.id);
  if (!team) {
    interaction.reply({ content: 'You need a team first — run `/team-create`.', ephemeral: true });
    return null;
  }
  return team;
}

function replyResult(interaction, title, msg) {
  return interaction.reply({ embeds: [baseEmbed(title).setDescription(msg)] });
}

// ---- Driver market: builds embed + buttons for up to 5 free agents per page ----
function buildMarketPage(freeAgents, page) {
  const pageSize = 5;
  const slice = freeAgents.slice(page * pageSize, page * pageSize + pageSize);
  const embed = baseEmbed('🏁 Driver Market — Free Agents')
    .setDescription(slice.map(d => `**${d.name}** — Skill ${d.skill}, Age ${d.age} — $${d.price.toLocaleString()}`).join('\n') || 'No free agents left.');
  const row = new ActionRowBuilder().addComponents(
    slice.map(d => new ButtonBuilder().setCustomId(`sign_${d.id}`).setLabel(d.name).setStyle(ButtonStyle.Primary))
  );
  return { embed, row };
}

async function handleCommand(interaction, database) {
  const { commandName } = interaction;

  if (commandName === 'team-create') {
    const name = interaction.options.getString('name');
    if (db.getTeam(database, interaction.user.id)) {
      return interaction.reply({ content: 'You already have a team.', ephemeral: true });
    }
    const team = db.createTeam(database, interaction.user.id, name);
    return interaction.reply({ embeds: [baseEmbed(`🏎️ ${team.name} Founded`).setDescription(`Starting budget: $${team.budget.toLocaleString()}`)] });
  }

  if (commandName === 'team-info') {
    const team = requireTeam(interaction, database); if (!team) return;
    const embed = baseEmbed(team.name)
      .addFields(
        { name: 'Budget', value: `$${team.budget.toLocaleString()}`, inline: true },
        { name: 'Reputation', value: `${team.reputation}`, inline: true },
        { name: 'Standings Points', value: `${team.standingsPoints}`, inline: true },
        { name: 'Car', value: `Aero ${team.car.aero} | Engine ${team.car.engine} | Chassis ${team.car.chassis} | Reliability ${team.car.reliability}` },
        { name: 'Drivers', value: team.drivers.map(d => `${d.name}: skill ${d.skill}, morale ${d.morale}, pts ${d.points}, wins ${d.wins}`).join('\n') },
        { name: 'Facilities', value: Object.entries(team.facilities).map(([k, v]) => `${k}: L${v}`).join(', ') },
        { name: 'Achievement', value: engine.seasonAchievement(team) }
      );
    return interaction.reply({ embeds: [embed] });
  }

  if (commandName === 'upgrade-car') {
    const team = requireTeam(interaction, database); if (!team) return;
    const part = interaction.options.getString('part');
    const result = engine.upgradeCarPart(team, part, Math.round(Math.random() * 3 + 1), 3_000_000);
    db.saveTeam(database, interaction.user.id, team);
    return replyResult(interaction, 'Car Upgrade', result.msg);
  }

  if (commandName === 'wind-tunnel') {
    const team = requireTeam(interaction, database); if (!team) return;
    const result = engine.windTunnelResearch(team);
    db.saveTeam(database, interaction.user.id, team);
    return replyResult(interaction, 'Wind Tunnel Research', result.msg);
  }

  if (commandName === 'reliability-program') {
    const team = requireTeam(interaction, database); if (!team) return;
    const result = engine.reliabilityProgram(team, 2_500_000);
    db.saveTeam(database, interaction.user.id, team);
    return replyResult(interaction, 'Reliability Program', result.msg);
  }

  if (commandName === 'upgrade-facility') {
    const team = requireTeam(interaction, database); if (!team) return;
    const facility = interaction.options.getString('facility');
    const cost = 5_000_000 * (team.facilities[facility] + 1);
    const result = engine.upgradeFacility(team, facility, cost);
    db.saveTeam(database, interaction.user.id, team);
    return replyResult(interaction, 'Facility Upgrade', result.msg);
  }

  if (commandName === 'hire-pit-crew') {
    const team = requireTeam(interaction, database); if (!team) return;
    const result = engine.hirePitCrew(team, 2_000_000);
    db.saveTeam(database, interaction.user.id, team);
    return replyResult(interaction, 'Pit Crew', result.msg);
  }

  if (commandName === 'train-driver') {
    const team = requireTeam(interaction, database); if (!team) return;
    const idx = interaction.options.getInteger('driver') - 1;
    const result = engine.trainDriver(team, idx, 1_500_000);
    db.saveTeam(database, interaction.user.id, team);
    return replyResult(interaction, 'Driver Training', result.msg);
  }

  if (commandName === 'negotiate-contract') {
    const team = requireTeam(interaction, database); if (!team) return;
    const idx = interaction.options.getInteger('driver') - 1;
    const years = interaction.options.getInteger('years');
    const result = engine.negotiateContract(team, idx, years);
    db.saveTeam(database, interaction.user.id, team);
    return replyResult(interaction, 'Contract Negotiation', result.msg);
  }

  if (commandName === 'scout-junior') {
    const team = requireTeam(interaction, database); if (!team) return;
    const result = engine.scoutJuniorDriver(team, 1_000_000);
    db.saveTeam(database, interaction.user.id, team);
    return replyResult(interaction, 'Scouting Report', result.msg);
  }

  if (commandName === 'promote-junior') {
    const team = requireTeam(interaction, database); if (!team) return;
    const idx = interaction.options.getInteger('index') - 1;
    const slot = interaction.options.getInteger('slot') - 1;
    const result = engine.promoteJunior(team, idx, slot);
    db.saveTeam(database, interaction.user.id, team);
    return replyResult(interaction, 'Junior Promotion', result.msg);
  }

  if (commandName === 'driver-market') {
    const team = requireTeam(interaction, database); if (!team) return;
    const freeAgents = driversData.getFreeAgents(database);
    const { embed, row } = buildMarketPage(freeAgents, 0);
    return interaction.reply({ embeds: [embed], components: freeAgents.length ? [row] : [] });
  }

  if (commandName === 'negotiate-sponsor') {
    const team = requireTeam(interaction, database); if (!team) return;
    const result = engine.negotiateSponsor(team);
    db.saveTeam(database, interaction.user.id, team);
    return replyResult(interaction, 'Sponsorship', result.msg);
  }

  if (commandName === 'finance') {
    const team = requireTeam(interaction, database); if (!team) return;
    return replyResult(interaction, 'Financial Report', engine.financialReport(team));
  }

  if (commandName === 'press-conference') {
    const team = requireTeam(interaction, database); if (!team) return;
    return replyResult(interaction, '🎙️ Press Conference', engine.pressConference(team));
  }

  if (commandName === 'race-weekend') {
    const team = requireTeam(interaction, database); if (!team) return;
    const strategy = interaction.options.getString('strategy');
    const practice = engine.simulatePractice(team);
    const trackName = database.calendar[(database.race - 1) % database.calendar.length];
    const embed = baseEmbed(`🏁 ${trackName} GP — Race ${database.race}`)
      .setDescription(`${practice.msg}\nTrack type: ${engine.trackType(database.race - 1)}`);

    for (const driver of team.drivers) {
      const grid = engine.simulateQualifying(team, driver);
      const result = engine.simulateRace(team, driver, grid, strategy);
      if (!result.finished) {
        embed.addFields({ name: driver.name, value: `Qualified P${grid}. ${result.msg}` });
      } else {
        let line = `Qualified P${grid}. Weather: ${result.weather}${result.vsc ? ' (Safety Car)' : ''}. Finished **P${result.position}**.`;
        if (engine.fastestLapBonus(team)) line += ' 🟣 Fastest Lap!';
        if (engine.redFlagCheck()) line += ' 🚩 Red flag interruption.';
        embed.addFields({ name: driver.name, value: line });
        engine.applyRaceResult(team, driver, result);
      }
    }
    embed.addFields({ name: 'News', value: engine.newsEvent() });
    database.race += 1;
    db.saveTeam(database, interaction.user.id, team);
    return interaction.reply({ embeds: [embed] });
  }

  if (commandName === 'standings') {
    const lb = db.getLeaderboard(database);
    if (lb.length === 0) return replyResult(interaction, 'Standings', 'No teams yet.');
    const text = lb.map((t, i) => `${i + 1}. **${t.name}** — ${t.standingsPoints} pts`).join('\n');
    return replyResult(interaction, '🏆 League Standings', text);
  }

  if (commandName === 'trophies') {
    const team = requireTeam(interaction, database); if (!team) return;
    const text = team.trophyCabinet.length ? team.trophyCabinet.map(t => t.title).join('\n') : 'No trophies yet — keep racing!';
    return replyResult(interaction, '🏆 Trophy Cabinet', text);
  }

  if (commandName === 'calendar') {
    return replyResult(interaction, '📅 Season Calendar',
      `Season ${database.season}, Race ${database.race}: **${database.calendar[(database.race - 1) % database.calendar.length]} GP**\n\nFull calendar:\n${database.calendar.join(', ')}`);
  }

  if (commandName === 'end-season') {
    const awards = engine.endOfSeasonAwards(database);
    engine.resetForNewSeason(database);
    db.saveDB(database);
    return replyResult(interaction, `🏆 Season ${database.season - 1} Final Standings`, `${awards}\n\nSeason ${database.season} begins!`);
  }
}

// ---- Button interactions (driver market signing) ----
async function handleButton(interaction, database) {
  const team = db.getTeam(database, interaction.user.id);
  if (!team) return interaction.reply({ content: 'You need a team first — run `/team-create`.', ephemeral: true });

  if (interaction.customId.startsWith('sign_')) {
    const driverId = interaction.customId.replace('sign_', '');
    const driverData = driversData.findById(driverId);
    if (!driverData) return interaction.reply({ content: 'That driver is no longer available.', ephemeral: true });

    const emptySlot = team.drivers.findIndex(d => !d.poolId && d.skill <= 40);
    const slot = emptySlot !== -1 ? emptySlot : 1;
    const result = engine.signFreeAgent(team, driverData, slot);
    db.saveTeam(database, interaction.user.id, team);
    return interaction.reply({ embeds: [baseEmbed('Driver Market').setDescription(result.msg)], ephemeral: true });
  }
}

module.exports = { commands, handleCommand, handleButton };
