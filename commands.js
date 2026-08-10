// commands.js
// Slash command definitions + handlers. Import into index.js.

const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const db = require('./database');
const engine = require('./gameEngine');

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

async function handleCommand(interaction, database) {
  const { commandName } = interaction;

  if (commandName === 'team-create') {
    const name = interaction.options.getString('name');
    if (db.getTeam(database, interaction.user.id)) {
      return interaction.reply({ content: 'You already have a team.', ephemeral: true });
    }
    const team = db.createTeam(database, interaction.user.id, name);
    return interaction.reply(`🏎️ Team **${team.name}** created! Starting budget: $${team.budget.toLocaleString()}.`);
  }

  if (commandName === 'team-info') {
    const team = requireTeam(interaction, database); if (!team) return;
    const embed = new EmbedBuilder()
      .setTitle(team.name)
      .addFields(
        { name: 'Budget', value: `$${team.budget.toLocaleString()}`, inline: true },
        { name: 'Reputation', value: `${team.reputation}`, inline: true },
        { name: 'Standings Points', value: `${team.standingsPoints}`, inline: true },
        { name: 'Car', value: `Aero ${team.car.aero} | Engine ${team.car.engine} | Chassis ${team.car.chassis} | Reliability ${team.car.reliability}` },
        { name: 'Drivers', value: team.drivers.map(d => `${d.name}: skill ${d.skill}, morale ${d.morale}, pts ${d.points}, wins ${d.wins}`).join('\n') },
        { name: 'Facilities', value: Object.entries(team.facilities).map(([k, v]) => `${k}: L${v}`).join(', ') }
      );
    return interaction.reply({ embeds: [embed] });
  }

  if (commandName === 'upgrade-car') {
    const team = requireTeam(interaction, database); if (!team) return;
    const part = interaction.options.getString('part');
    const result = engine.upgradeCarPart(team, part, Math.round(Math.random() * 3 + 1), 3_000_000);
    db.saveTeam(database, interaction.user.id, team);
    return interaction.reply(result.msg);
  }

  if (commandName === 'wind-tunnel') {
    const team = requireTeam(interaction, database); if (!team) return;
    const result = engine.windTunnelResearch(team);
    db.saveTeam(database, interaction.user.id, team);
    return interaction.reply(result.msg);
  }

  if (commandName === 'reliability-program') {
    const team = requireTeam(interaction, database); if (!team) return;
    const result = engine.reliabilityProgram(team, 2_500_000);
    db.saveTeam(database, interaction.user.id, team);
    return interaction.reply(result.msg);
  }

  if (commandName === 'upgrade-facility') {
    const team = requireTeam(interaction, database); if (!team) return;
    const facility = interaction.options.getString('facility');
    const cost = 5_000_000 * (team.facilities[facility] + 1);
    const result = engine.upgradeFacility(team, facility, cost);
    db.saveTeam(database, interaction.user.id, team);
    return interaction.reply(result.msg);
  }

  if (commandName === 'hire-pit-crew') {
    const team = requireTeam(interaction, database); if (!team) return;
    const result = engine.hirePitCrew(team, 2_000_000);
    db.saveTeam(database, interaction.user.id, team);
    return interaction.reply(result.msg);
  }

  if (commandName === 'train-driver') {
    const team = requireTeam(interaction, database); if (!team) return;
    const idx = interaction.options.getInteger('driver') - 1;
    const result = engine.trainDriver(team, idx, 1_500_000);
    db.saveTeam(database, interaction.user.id, team);
    return interaction.reply(result.msg);
  }

  if (commandName === 'negotiate-contract') {
    const team = requireTeam(interaction, database); if (!team) return;
    const idx = interaction.options.getInteger('driver') - 1;
    const years = interaction.options.getInteger('years');
    const result = engine.negotiateContract(team, idx, years);
    db.saveTeam(database, interaction.user.id, team);
    return interaction.reply(result.msg);
  }

  if (commandName === 'scout-junior') {
    const team = requireTeam(interaction, database); if (!team) return;
    const result = engine.scoutJuniorDriver(team, 1_000_000);
    db.saveTeam(database, interaction.user.id, team);
    return interaction.reply(result.msg);
  }

  if (commandName === 'promote-junior') {
    const team = requireTeam(interaction, database); if (!team) return;
    const idx = interaction.options.getInteger('index') - 1;
    const slot = interaction.options.getInteger('slot') - 1;
    const result = engine.promoteJunior(team, idx, slot);
    db.saveTeam(database, interaction.user.id, team);
    return interaction.reply(result.msg);
  }

  if (commandName === 'negotiate-sponsor') {
    const team = requireTeam(interaction, database); if (!team) return;
    const result = engine.negotiateSponsor(team);
    db.saveTeam(database, interaction.user.id, team);
    return interaction.reply(result.msg);
  }

  if (commandName === 'finance') {
    const team = requireTeam(interaction, database); if (!team) return;
    return interaction.reply(engine.financialReport(team));
  }

  if (commandName === 'press-conference') {
    const team = requireTeam(interaction, database); if (!team) return;
    return interaction.reply(`🎙️ ${engine.pressConference(team)}`);
  }

  if (commandName === 'race-weekend') {
    const team = requireTeam(interaction, database); if (!team) return;
    const strategy = interaction.options.getString('strategy');
    const practice = engine.simulatePractice(team);
    let output = `**${database.calendar[(database.race - 1) % database.calendar.length]} GP — Race ${database.race}**\n${practice.msg}\n`;

    for (const driver of team.drivers) {
      const grid = engine.simulateQualifying(team, driver);
      output += `\n${driver.name} qualifies P${grid}.`;
      const result = engine.simulateRace(team, driver, grid, strategy);
      if (!result.finished) {
        output += `\n${result.msg}`;
      } else {
        output += `\nWeather: ${result.weather}${result.vsc ? ' (Safety Car deployed)' : ''}. Finishes P${result.position}.`;
        engine.applyRaceResult(team, driver, result);
      }
    }
    database.race += 1;
    db.saveTeam(database, interaction.user.id, team);
    return interaction.reply(output);
  }

  if (commandName === 'standings') {
    const lb = db.getLeaderboard(database);
    if (lb.length === 0) return interaction.reply('No teams yet.');
    const text = lb.map((t, i) => `${i + 1}. **${t.name}** — ${t.standingsPoints} pts`).join('\n');
    return interaction.reply(text);
  }

  if (commandName === 'trophies') {
    const team = requireTeam(interaction, database); if (!team) return;
    if (team.trophyCabinet.length === 0) return interaction.reply('No trophies yet — keep racing!');
    return interaction.reply(team.trophyCabinet.map(t => t.title).join('\n'));
  }

  if (commandName === 'calendar') {
    return interaction.reply(`Season ${database.season}, Race ${database.race}: **${database.calendar[(database.race - 1) % database.calendar.length]} GP**\n\nFull calendar:\n${database.calendar.join(', ')}`);
  }

  if (commandName === 'end-season') {
    const awards = engine.endOfSeasonAwards(database);
    engine.resetForNewSeason(database);
    db.saveDB(database);
    return interaction.reply(`🏆 **Season ${database.season - 1} Final Standings**\n${awards}\n\nSeason ${database.season} begins!`);
  }
}

module.exports = { commands, handleCommand };
