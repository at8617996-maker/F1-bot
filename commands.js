// commands.js
// Slash commands, buttons, modals, and select menus. Multi-stage race
// weekend and driver negotiation flows use an in-memory session store
// (sessions reset if the bot restarts mid-flow — acceptable for
// ephemeral gameplay state).

const {
  SlashCommandBuilder, EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle,
  AttachmentBuilder, ModalBuilder, TextInputBuilder, TextInputStyle
} = require('discord.js');
const db = require('./database');
const engine = require('./gameEngine');
const driversData = require('./drivers');
const teamsData = require('./teams');
const imageGen = require('./imageGen');
const news = require('./news');

const BRAND_COLOR = 0xE10600;
const sessions = new Map(); // userId -> race weekend session state
const negotiations = new Map(); // userId -> in-progress driver negotiation state

function baseEmbed(title) {
  return new EmbedBuilder().setColor(BRAND_COLOR).setTitle(title).setTimestamp();
}

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

// ---------------------------------------------------------------------
// Slash command definitions
// ---------------------------------------------------------------------
const commands = [
  new SlashCommandBuilder().setName('team-create')
    .setDescription('Create your F1 team')
    .addStringOption(o => o.setName('name').setDescription('Team name').setRequired(true)),

  new SlashCommandBuilder().setName('team-info').setDescription('View your team overview'),

  new SlashCommandBuilder().setName('upgrade-car').setDescription('Open the car development lobby'),

  new SlashCommandBuilder().setName('upgrade-facility')
    .setDescription('Upgrade a team facility')
    .addStringOption(o => o.setName('facility').setDescription('Facility to upgrade').setRequired(true)
      .addChoices(
        { name: 'Wind Tunnel', value: 'windTunnel' },
        { name: 'Factory', value: 'factory' },
        { name: 'Simulator', value: 'simulator' },
        { name: 'Academy', value: 'academy' }
      )),

  new SlashCommandBuilder().setName('hire-pit-crew').setDescription('Invest in your pit crew skill'),

  new SlashCommandBuilder().setName('train-driver')
    .setDescription('Train a driver to boost skill')
    .addIntegerOption(o => o.setName('driver').setDescription('1 or 2').setRequired(true).addChoices({ name: 'Driver 1', value: 1 }, { name: 'Driver 2', value: 2 })),

  new SlashCommandBuilder().setName('negotiate-contract')
    .setDescription('Extend a driver contract')
    .addIntegerOption(o => o.setName('driver').setDescription('1 or 2').setRequired(true).addChoices({ name: 'Driver 1', value: 1 }, { name: 'Driver 2', value: 2 }))
    .addIntegerOption(o => o.setName('years').setDescription('Number of years').setRequired(true)),

  new SlashCommandBuilder().setName('scout-junior').setDescription('Scout a junior category prospect (F2/F3/F4)'),

  new SlashCommandBuilder().setName('promote-junior')
    .setDescription('Promote a junior prospect to the race seat')
    .addIntegerOption(o => o.setName('index').setDescription('Junior index (1-based)').setRequired(true))
    .addIntegerOption(o => o.setName('slot').setDescription('1 or 2').setRequired(true).addChoices({ name: 'Driver 1', value: 1 }, { name: 'Driver 2', value: 2 })),

  new SlashCommandBuilder().setName('driver-market').setDescription('Search and sign real F1 drivers as free agents'),

  new SlashCommandBuilder().setName('negotiate-sponsor').setDescription('Pursue a new sponsorship deal'),
  new SlashCommandBuilder().setName('finance').setDescription('View your financial report'),
  new SlashCommandBuilder().setName('press-conference').setDescription('Hold a press conference'),
  new SlashCommandBuilder().setName('news').setDescription('Get the latest real F1 headlines'),

  new SlashCommandBuilder().setName('race-weekend').setDescription('Begin the next race weekend (practice, qualifying, race)'),

  new SlashCommandBuilder().setName('standings').setDescription('View the Constructors\' standings (WCC)'),
  new SlashCommandBuilder().setName('wdc').setDescription('View the Drivers\' Championship standings'),
  new SlashCommandBuilder().setName('wcc').setDescription('View the Constructors\' Championship standings'),
  new SlashCommandBuilder().setName('trophies').setDescription('View your trophy cabinet'),
  new SlashCommandBuilder().setName('calendar').setDescription('View the full 24-race season calendar with track details'),
  new SlashCommandBuilder().setName('end-season').setDescription('Close out the season and reset for next season')
];

// ---------------------------------------------------------------------
// Slash command handling
// ---------------------------------------------------------------------
async function handleCommand(interaction, database) {
  const { commandName } = interaction;

  if (commandName === 'team-create') {
    const name = interaction.options.getString('name');
    if (db.getTeam(database, interaction.user.id)) {
      return interaction.reply({ content: 'You already have a team.', ephemeral: true });
    }
    const team = db.createTeam(database, interaction.user.id, name);
    const imgBuffer = imageGen.generateTeamCard(team);
    const attachment = new AttachmentBuilder(imgBuffer, { name: 'team-card.png' });
    const embed = baseEmbed(`🏎️ ${team.name} Founded`)
      .setDescription(`Starting budget: $${team.budget.toLocaleString()}`)
      .setImage('attachment://team-card.png');
    return interaction.reply({ embeds: [embed], files: [attachment] });
  }

  if (commandName === 'team-info') {
    const team = requireTeam(interaction, database); if (!team) return;
    const embed = baseEmbed(team.name)
      .addFields(
        { name: 'Budget', value: `$${team.budget.toLocaleString()}`, inline: true },
        { name: 'Reputation', value: `${team.reputation}`, inline: true },
        { name: 'Research Points', value: `${team.researchPoints || 0}`, inline: true },
        { name: 'WCC Points', value: `${team.standingsPoints}`, inline: true },
        { name: 'Car', value: `Aero ${team.car.aero} | Engine ${team.car.engine} | Chassis ${team.car.chassis} | Reliability ${team.car.reliability}` },
        { name: 'Drivers', value: team.drivers.map(d => `${d.name}: skill ${d.skill}, morale ${d.morale}, pts ${d.points}, wins ${d.wins}`).join('\n') },
        { name: 'Facilities', value: Object.entries(team.facilities).map(([k, v]) => `${k}: L${v}`).join(', ') },
        { name: 'Achievement', value: engine.seasonAchievement(team) }
      );
    return interaction.reply({ embeds: [embed] });
  }

  if (commandName === 'upgrade-car') {
    const team = requireTeam(interaction, database); if (!team) return;
    return sendResearchLobby(interaction, team);
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
    const categories = ['F2', 'F3', 'F4'];
    const category = categories[Math.floor(Math.random() * categories.length)];
    const cost = category === 'F2' ? 1_500_000 : category === 'F3' ? 900_000 : 500_000;
    if (team.budget < cost) return replyResult(interaction, 'Scouting Report', 'Not enough budget.');
    team.budget -= cost;
    const prospect = teamsData.generateJuniorProspect(category);
    team.juniors.push(prospect);
    db.saveTeam(database, interaction.user.id, team);
    return replyResult(interaction, 'Scouting Report', `Scouted **${prospect.name}** (${category}) — skill ${prospect.skill}, potential ${prospect.potential}.`);
  }

  if (commandName === 'promote-junior') {
    const team = requireTeam(interaction, database); if (!team) return;
    const idx = interaction.options.getInteger('index') - 1;
    const slot = interaction.options.getInteger('slot') - 1;
    const junior = team.juniors[idx];
    if (!junior) return replyResult(interaction, 'Junior Promotion', 'Invalid junior index.');
    team.drivers[slot] = { name: junior.name, skill: junior.skill, morale: 70, age: junior.age, contractYears: 2, wins: 0, podiums: 0, points: 0, poolId: null };
    team.juniors.splice(idx, 1);
    db.saveTeam(database, interaction.user.id, team);
    return replyResult(interaction, 'Junior Promotion', `${junior.name} promoted to the race seat.`);
  }

  if (commandName === 'driver-market') {
    const team = requireTeam(interaction, database); if (!team) return;
    const modal = new ModalBuilder().setCustomId('market_search').setTitle('Search Driver Market');
    const input = new TextInputBuilder().setCustomId('search_query').setLabel('Driver name (or leave blank for all)')
      .setStyle(TextInputStyle.Short).setRequired(false);
    modal.addComponents(new ActionRowBuilder().addComponents(input));
    return interaction.showModal(modal);
  }

  if (commandName === 'negotiate-sponsor') {
    const team = requireTeam(interaction, database); if (!team) return;
    const offer = Math.round(Math.random() * 8_000_000 + 2_000_000) * (1 + team.reputation / 100);
    const embed = baseEmbed('💼 Sponsorship Offer')
      .setDescription(`A sponsor offers **$${Math.round(offer).toLocaleString()}** for a season-long deal.`);
    const row = new ActionRowBuilder().addComponents(
      new ButtonBuilder().setCustomId(`sponsor_accept_${Math.round(offer)}`).setLabel('Accept').setStyle(ButtonStyle.Success),
      new ButtonBuilder().setCustomId('sponsor_counter').setLabel('Counter-offer').setStyle(ButtonStyle.Primary),
      new ButtonBuilder().setCustomId('sponsor_decline').setLabel('Decline').setStyle(ButtonStyle.Danger)
    );
    return interaction.reply({ embeds: [embed], components: [row] });
  }

  if (commandName === 'finance') {
    const team = requireTeam(interaction, database); if (!team) return;
    return replyResult(interaction, 'Financial Report', engine.financialReport(team));
  }

  if (commandName === 'press-conference') {
    const team = requireTeam(interaction, database); if (!team) return;
    return replyResult(interaction, '🎙️ Press Conference', engine.pressConference(team));
  }

  if (commandName === 'news') {
    await interaction.deferReply();
    const headlines = await news.fetchF1News(5);
    if (headlines.length === 0) {
      return interaction.editReply({ embeds: [baseEmbed('📰 F1 News').setDescription('Could not fetch news right now — try again shortly.')] });
    }
    const embed = baseEmbed('📰 Latest F1 News')
      .setDescription(headlines.map(h => `**${h.title}**\n${h.link}`).join('\n\n'));
    return interaction.editReply({ embeds: [embed] });
  }

  if (commandName === 'race-weekend') {
    const team = requireTeam(interaction, database); if (!team) return;
    return startRaceWeekend(interaction, database, team);
  }

  if (commandName === 'standings' || commandName === 'wcc') {
    const lb = engine.getWCCStandings(database);
    if (lb.length === 0) return replyResult(interaction, 'WCC Standings', 'No teams yet.');
    const text = lb.map((t, i) => `${i + 1}. **${t.name}** — ${t.points} pts`).join('\n');
    return replyResult(interaction, '🏆 Constructors\' Championship', text);
  }

  if (commandName === 'wdc') {
    const lb = engine.getWDCStandings(database).slice(0, 15);
    if (lb.length === 0) return replyResult(interaction, 'WDC Standings', 'No drivers yet.');
    const text = lb.map((d, i) => `${i + 1}. **${d.name}** (${d.team}) — ${d.points} pts`).join('\n');
    return replyResult(interaction, '🏆 Drivers\' Championship', text);
  }

  if (commandName === 'trophies') {
    const team = requireTeam(interaction, database); if (!team) return;
    const text = team.trophyCabinet.length ? team.trophyCabinet.map(t => t.title).join('\n') : 'No trophies yet — keep racing!';
    return replyResult(interaction, '🏆 Trophy Cabinet', text);
  }

  if (commandName === 'calendar') {
    const embed = baseEmbed(`📅 Season ${database.season} Calendar`)
      .setDescription(`Currently on Race ${database.race} of 24. Figures below are approximate gameplay stats, not official records.`);
    db.TRACKS.forEach((t, i) => {
      embed.addFields({
        name: `${i + 1}. ${t.name}`,
        value: `Laps: ${t.laps} | Corners: ${t.corners} | Rain chance: ${t.wetChance}% | Type: ${t.type}`,
        inline: true
      });
    });
    return interaction.reply({ embeds: [embed] });
  }

  if (commandName === 'end-season') {
    const awards = engine.endOfSeasonAwards(database);
    engine.resetForNewSeason(database);
    db.saveDB(database);
    return replyResult(interaction, `🏆 Season ${database.season - 1} Final Standings`, `${awards}\n\nSeason ${database.season} begins!`);
  }
}

// ---------------------------------------------------------------------
// Research lobby (upgrade-car)
// ---------------------------------------------------------------------
function sendResearchLobby(interactionOrMsg, team, edit = false) {
  const embed = baseEmbed('🔧 Car Development Lobby')
    .setDescription(`Research Points: **${team.researchPoints || 0}**`)
    .addFields(
      { name: 'Aero', value: `${team.car.aero}`, inline: true },
      { name: 'Powertrain', value: `${team.car.engine}`, inline: true },
      { name: 'Chassis', value: `${team.car.chassis}`, inline: true },
      { name: 'Reliability', value: `${team.car.reliability}`, inline: true }
    );
  const row = new ActionRowBuilder().addComponents(
    new ButtonBuilder().setCustomId('research_aero').setLabel('Research Aero (3 pts)').setStyle(ButtonStyle.Primary),
    new ButtonBuilder().setCustomId('research_powertrain').setLabel('Research Powertrain (3 pts)').setStyle(ButtonStyle.Primary),
    new ButtonBuilder().setCustomId('research_chassis').setLabel('Research Chassis (3 pts)').setStyle(ButtonStyle.Primary)
  );
  const payload = { embeds: [embed], components: [row] };
  return edit ? interactionOrMsg.update(payload) : interactionOrMsg.reply(payload);
}

// ---------------------------------------------------------------------
// Race weekend flow
// ---------------------------------------------------------------------
const STAGES = ['Practice 1', 'Practice 2', 'Qualifying', 'Race'];

function buildRivals(track) {
  // Fictional AI rival cars using real constructor names, no invented
  // real-person dialogue or identity attached — pace only.
  return teamsData.REAL_TEAMS.map(t => ({
    name: `${t.name} Works Car`,
    pace: Math.round(60 + Math.random() * 35)
  }));
}

async function startRaceWeekend(interaction, database, team) {
  const trackInfo = db.getTrackInfo(database.race - 1);
  sessions.set(interaction.user.id, {
    stageIndex: 0,
    trackInfo,
    grid: null,
    rivals: buildRivals(trackInfo)
  });
  const embed = baseEmbed(`🏁 ${trackInfo.name} GP — Race ${database.race}/24`)
    .setDescription(`Laps: ${trackInfo.laps} | Corners: ${trackInfo.corners} | Rain chance: ${trackInfo.wetChance}% | Type: ${trackInfo.type}`);
  const row = new ActionRowBuilder().addComponents(
    new ButtonBuilder().setCustomId('weekend_begin').setLabel('Begin Weekend').setStyle(ButtonStyle.Success)
  );
  return interaction.reply({ embeds: [embed], components: [row] });
}

function stageEmbed(stageName) {
  return baseEmbed(`${stageName}`).setDescription('Ready to hit the track.');
}

async function sendSessionStart(interaction, stageName) {
  const row = new ActionRowBuilder().addComponents(
    new ButtonBuilder().setCustomId('session_simulate').setLabel('Simulate Session').setStyle(ButtonStyle.Primary)
  );
  return interaction.update({ embeds: [stageEmbed(stageName)], components: [row] });
}

async function sendStrategyChoice(interaction, stageName) {
  const embed = baseEmbed(stageName).setDescription('Choose your strategy for the flying lap.');
  const row = new ActionRowBuilder().addComponents(
    new ButtonBuilder().setCustomId('strategy_push').setLabel('🔴 Push Lap').setStyle(ButtonStyle.Danger),
    new ButtonBuilder().setCustomId('strategy_manage').setLabel('🟢 Manage Pace').setStyle(ButtonStyle.Success)
  );
  return interaction.update({ embeds: [embed], components: [row] });
}

async function runFlyingLapAndShowBoard(interaction, database, team, session, strategy) {
  const stageName = STAGES[session.stageIndex];
  const entries = [];

  for (const driver of team.drivers) {
    const result = engine.flyingLapTime(team, driver, strategy);
    entries.push({ name: `${driver.name} (You)`, time: result.error ? null : result.time });
  }
  for (const rival of session.rivals) {
    const base = 91 - rival.pace / 10;
    entries.push({ name: rival.name, time: base + (Math.random() * 1.2 - 0.4) });
  }

  const board = engine.buildSessionLeaderboard(entries);
  const userPositions = board.filter(b => b.name.includes('(You)')).map(b => b.position);
  session.lastBoard = board;
  if (stageName === 'Qualifying') session.grid = board;

  const imgBuffer = imageGen.generateLeaderboard(stageName, board);
  const attachment = new AttachmentBuilder(imgBuffer, { name: 'leaderboard.png' });
  const embed = baseEmbed(`${stageName} Results`)
    .setDescription(`Your cars: P${userPositions.join(', P')}`)
    .setImage('attachment://leaderboard.png');

  const isLastPreRaceStage = session.stageIndex < STAGES.length - 1;
  const row = new ActionRowBuilder().addComponents(
    new ButtonBuilder().setCustomId(isLastPreRaceStage ? 'weekend_continue' : 'weekend_finish').setLabel(isLastPreRaceStage ? 'Continue' : 'Finish Weekend').setStyle(ButtonStyle.Success)
  );

  await interaction.update({ embeds: [embed], components: [row], files: [attachment] });
}

async function runRaceStage(interaction, database, team, session) {
  const strategy = 'push'; // race pace uses push/manage from prior stage aggregate; simplified to push baseline
  const grid = session.grid || [];
  const results = [];

  for (const driver of team.drivers) {
    const gridEntry = grid.find(g => g.name === `${driver.name} (You)`);
    const gridPos = gridEntry ? gridEntry.position : 10;
    const raceResult = engine.simulateRace(team, driver, gridPos, 'Dry');
    results.push({ driver, raceResult, gridPos });
  }

  for (const driver_result of results) {
    engine.applyRaceResult(team, driver_result.driver, driver_result.raceResult);
  }

  const boardEntries = results.map(r => ({
    name: `${r.driver.name} (You)`,
    time: r.raceResult.finished ? 90 - r.raceResult.position * 0.3 : null
  }));
  for (const rival of session.rivals) {
    boardEntries.push({ name: rival.name, time: 90 - Math.random() * 15 });
  }
  const board = engine.buildSessionLeaderboard(boardEntries);

  const imgBuffer = imageGen.generateLeaderboard('Race Result', board);
  const attachment = new AttachmentBuilder(imgBuffer, { name: 'race-result.png' });
  const summary = results.map(r => r.raceResult.finished
    ? `${r.driver.name}: P${r.raceResult.position} (+${engine.pointsForPosition(r.raceResult.position)} pts)`
    : `${r.driver.name}: DNF`).join('\n');

  database.race += 1;
  db.saveTeam(database, interaction.user.id, team);
  sessions.delete(interaction.user.id);

  const embed = baseEmbed('🏁 Race Result').setDescription(summary).setImage('attachment://race-result.png');
  return interaction.update({ embeds: [embed], components: [], files: [attachment] });
}

// ---------------------------------------------------------------------
// Button interactions
// ---------------------------------------------------------------------
async function handleButton(interaction, database) {
  const team = db.getTeam(database, interaction.user.id);
  if (!team) return interaction.reply({ content: 'You need a team first — run `/team-create`.', ephemeral: true });
  const id = interaction.customId;

  // ---- Driver market signing / negotiation ----
  if (id.startsWith('negotiate_')) {
    const driverId = id.replace('negotiate_', '');
    const driverData = driversData.findById(driverId);
    if (!driverData) return interaction.reply({ content: 'That driver is no longer available.', ephemeral: true });
    negotiations.set(interaction.user.id, { driverData, offers: 0 });
    const embed = baseEmbed(`Negotiation: ${driverData.name}`)
      .setDescription(`A management agent responds on behalf of **${driverData.name}**.\n\n"We've seen your team's numbers. Asking price is $${driverData.price.toLocaleString()}. Reply in this channel with your offer, or use the buttons below."`);
    const row = new ActionRowBuilder().addComponents(
      new ButtonBuilder().setCustomId(`sign_${driverId}`).setLabel(`Sign for $${driverData.price.toLocaleString()}`).setStyle(ButtonStyle.Success),
      new ButtonBuilder().setCustomId('negotiate_cancel').setLabel('Walk Away').setStyle(ButtonStyle.Danger)
    );
    return interaction.reply({ embeds: [embed], components: [row] });
  }

  if (id === 'negotiate_cancel') {
    negotiations.delete(interaction.user.id);
    return interaction.reply({ content: 'Negotiation ended.', ephemeral: true });
  }

  if (id.startsWith('sign_')) {
    const driverId = id.replace('sign_', '');
    const driverData = driversData.findById(driverId);
    if (!driverData) return interaction.reply({ content: 'That driver is no longer available.', ephemeral: true });
    const emptySlot = team.drivers.findIndex(d => !d.poolId && d.skill <= 40);
    const slot = emptySlot !== -1 ? emptySlot : 1;
    const result = engine.signFreeAgent(team, driverData, slot);
    db.saveTeam(database, interaction.user.id, team);
    negotiations.delete(interaction.user.id);
    return interaction.reply({ embeds: [baseEmbed('Driver Market').setDescription(result.msg)] });
  }

  // ---- Sponsor negotiation ----
  if (id.startsWith('sponsor_accept_')) {
    const amount = parseInt(id.replace('sponsor_accept_', ''), 10);
    team.budget += amount;
    team.sponsors.push({ name: `Sponsor ${team.sponsors.length + 1}`, payout: amount });
    db.saveTeam(database, interaction.user.id, team);
    return interaction.update({ embeds: [baseEmbed('Sponsorship Signed').setDescription(`Deal accepted for $${amount.toLocaleString()}.`)], components: [] });
  }
  if (id === 'sponsor_counter') {
    const bumped = Math.round((team.reputation + 50) * 50_000);
    team.budget += bumped;
    team.sponsors.push({ name: `Sponsor ${team.sponsors.length + 1}`, payout: bumped });
    db.saveTeam(database, interaction.user.id, team);
    return interaction.update({ embeds: [baseEmbed('Sponsorship Negotiated').setDescription(`Counter-offer accepted: $${bumped.toLocaleString()}.`)], components: [] });
  }
  if (id === 'sponsor_decline') {
    return interaction.update({ embeds: [baseEmbed('Sponsorship Declined').setDescription('No deal was made.')], components: [] });
  }

  // ---- Research lobby ----
  if (id.startsWith('research_')) {
    const dept = id.replace('research_', '');
    const result = engine.researchDepartment(team, dept, 3);
    db.saveTeam(database, interaction.user.id, team);
    return sendResearchLobby(interaction, team, true);
  }

  // ---- Race weekend flow ----
  if (id === 'weekend_begin') {
    const session = sessions.get(interaction.user.id);
    if (!session) return interaction.reply({ content: 'No active weekend. Run /race-weekend again.', ephemeral: true });
    return sendSessionStart(interaction, STAGES[session.stageIndex]);
  }

  if (id === 'session_simulate') {
    const session = sessions.get(interaction.user.id);
    if (!session) return interaction.reply({ content: 'No active weekend. Run /race-weekend again.', ephemeral: true });
    if (STAGES[session.stageIndex] === 'Race') {
      return runRaceStage(interaction, database, team, session);
    }
    return sendStrategyChoice(interaction, STAGES[session.stageIndex]);
  }

  if (id === 'strategy_push' || id === 'strategy_manage') {
    const session = sessions.get(interaction.user.id);
    if (!session) return interaction.reply({ content: 'No active weekend. Run /race-weekend again.', ephemeral: true });
    const strategy = id === 'strategy_push' ? 'push' : 'manage';
    return runFlyingLapAndShowBoard(interaction, database, team, session, strategy);
  }

  if (id === 'weekend_continue') {
    const session = sessions.get(interaction.user.id);
    if (!session) return interaction.reply({ content: 'No active weekend. Run /race-weekend again.', ephemeral: true });
    session.stageIndex += 1;
    return sendSessionStart(interaction, STAGES[session.stageIndex]);
  }

  if (id === 'weekend_finish') {
    const session = sessions.get(interaction.user.id);
    if (!session) return interaction.reply({ content: 'No active weekend. Run /race-weekend again.', ephemeral: true });
    session.stageIndex = STAGES.indexOf('Race');
    return runRaceStage(interaction, database, team, session);
  }
}

// ---------------------------------------------------------------------
// Modal submissions (driver market search)
// ---------------------------------------------------------------------
async function handleModal(interaction, database) {
  if (interaction.customId === 'market_search') {
    const query = interaction.fields.getTextInputValue('search_query').trim().toLowerCase();
    const freeAgents = driversData.getFreeAgents(database);
    const matches = query
      ? freeAgents.filter(d => d.name.toLowerCase().includes(query))
      : freeAgents.slice(0, 5);

    if (matches.length === 0) {
      return interaction.reply({ content: 'No matching free agents found.', ephemeral: true });
    }

    const embed = baseEmbed('🔍 Driver Market Results')
      .setDescription(matches.map(d => {
        const realTeam = teamsData.getTeamForDriver(d.id);
        return `**${d.name}** ${realTeam ? `(${realTeam.name})` : ''} — Skill ${d.skill}, Age ${d.age} — $${d.price.toLocaleString()}`;
      }).join('\n'));
    const row = new ActionRowBuilder().addComponents(
      matches.slice(0, 5).map(d => new ButtonBuilder().setCustomId(`negotiate_${d.id}`).setLabel(d.name).setStyle(ButtonStyle.Primary))
    );
    return interaction.reply({ embeds: [embed], components: [row] });
  }
}

module.exports = { commands, handleCommand, handleButton, handleModal };
