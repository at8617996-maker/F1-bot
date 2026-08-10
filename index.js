// index.js
// Main entry point. Boots the Discord client, registers slash commands,
// and routes interactions to commands.js.

require('dotenv').config();
const { Client, GatewayIntentBits } = require('discord.js');
const db = require('./database');
const { commands, handleCommand } = require('./commands');

const TOKEN = process.env.DISCORD_TOKEN;

if (!TOKEN) {
  console.error('Missing DISCORD_TOKEN in environment variables.');
  process.exit(1);
}

const client = new Client({ intents: [GatewayIntentBits.Guilds] });
const database = db.loadDB();

async function registerCommands() {
  const body = commands.map(c => c.toJSON());
  try {
    // Uses the logged-in client's own application ID — no separate CLIENT_ID needed.
    await client.application.commands.set(body);
    console.log(`Registered ${body.length} slash commands.`);
  } catch (err) {
    console.error('Failed to register commands:', err);
  }
}

client.once('ready', async () => {
  console.log(`Logged in as ${client.user.tag}`);
  await registerCommands();
});

client.on('interactionCreate', async (interaction) => {
  if (!interaction.isChatInputCommand()) return;
  try {
    await handleCommand(interaction, database);
  } catch (err) {
    console.error(err);
    if (interaction.replied || interaction.deferred) {
      await interaction.followUp({ content: 'Something went wrong running that command.', ephemeral: true });
    } else {
      await interaction.reply({ content: 'Something went wrong running that command.', ephemeral: true });
    }
  }
});

client.login(TOKEN);
