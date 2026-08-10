// index.js
// Main entry point. Boots the Discord client, registers slash commands,
// and routes interactions to commands.js.

require('dotenv').config();
const { Client, GatewayIntentBits, REST, Routes } = require('discord.js');
const db = require('./database');
const { commands, handleCommand } = require('./commands');

const TOKEN = process.env.DISCORD_TOKEN;
const CLIENT_ID = process.env.CLIENT_ID;

if (!TOKEN || !CLIENT_ID) {
  console.error('Missing DISCORD_TOKEN or CLIENT_ID in environment variables.');
  process.exit(1);
}

const client = new Client({ intents: [GatewayIntentBits.Guilds] });
const database = db.loadDB();

async function registerCommands() {
  const rest = new REST({ version: '10' }).setToken(TOKEN);
  const body = commands.map(c => c.toJSON());
  try {
    await rest.put(Routes.applicationCommands(CLIENT_ID), { body });
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
