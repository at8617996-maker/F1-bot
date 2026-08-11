/**
 * ============================================================================
 * F1 MANAGER DISCORD BOT - FILE 3 OF 7 (TEAM & FC26 CARD ENGINE)
 * ============================================================================
 * Architecture Overview (7 Files Total):
 * File 1: index.js - Core Engine, Global State, Database & Handlers
 * File 2: driverMarket.js - AI Negotiation Engine & Generative Chat
 * File 3: teamManager.js - FC26 Style Card Generator, Lineup UI & Finances [THIS FILE]
 * File 4: sponsorEngine.js - Sponsor Negotiation, Objective Tracking & Payout System
 * File 5: carRnd.js - UI Lobby, Research Point System & Department Upgrades
 * File 6: raceSim.js - Session Engine (FP1-3, Quali, Race), Flying Laps & Dynamic Weather
 * File 7: telemetryEngine.js - Dynamic Leaderboards, Math Engine & Card Visualizer
 *
 * Integrated Features in this File:
 * - EA SPORTS FC 26 Style Ultimate Team Card Generator (Dynamic Canvas Image).
 * - Custom Team Creation & Logo Assignment.
 * - Dynamic 3-Driver Team Lineup Visualizer (Primary, Secondary, Reserve).
 * - FIA Cost Cap Audit & Financial Ledger Engine.
 * - Facility Upgrades Maintenance Fees.
 * - Fanbase Merchandising Revenue Calculations.
 * ============================================================================
 */

const { EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle, AttachmentBuilder } = require('discord.js');
const { createCanvas, loadImage, registerFont } = require('canvas');
const { gameStates } = require('./index.js');
const fs = require('fs');

// ----------------------------------------------------------------------------
// 1. FC 26 ULTIMATE TEAM STYLE CARD GENERATOR (CANVAS ENGINE)
// ----------------------------------------------------------------------------
// Note: In a production environment, ensure 'canvas' is installed and custom fonts are loaded.
// registerFont('./assets/fonts/CruyffSans-Bold.ttf', { family: 'FC26Font' });

async function generateFC26DriverCard(driver, cardType = 'RARE_GOLD') {
  // Canvas dimensions standard to Ultimate Team cards (approx 400x560)
  const width = 400;
  const height = 560;
  const canvas = createCanvas(width, height);
  const ctx = canvas.getContext('2d');

  // Background Styling based on Card Type
  let gradient = ctx.createLinearGradient(0, 0, width, height);
  if (cardType === 'RARE_GOLD') {
    gradient.addColorStop(0, '#E8C766'); // Golden Top
    gradient.addColorStop(0.5, '#B78727'); // Deep Gold Middle
    gradient.addColorStop(1, '#6F4E12'); // Dark Gold Bottom
  } else if (cardType === 'ICON') {
    gradient.addColorStop(0, '#FFFFFF'); // Bright White
    gradient.addColorStop(0.5, '#E2E2E2'); // Silver White
    gradient.addColorStop(1, '#8C8C8C'); // Metallic Bottom
  } else if (cardType === 'ROOKIE') {
    gradient.addColorStop(0, '#2ECC71'); // Neon Green
    gradient.addColorStop(0.5, '#27AE60'); // Dark Green
    gradient.addColorStop(1, '#145A32'); // Deep Shadow Green
  } else {
    // Default F1 Dark Red
    gradient.addColorStop(0, '#E10600');
    gradient.addColorStop(1, '#5B0200');
  }

  // Draw Card Base Shield Shape
  ctx.fillStyle = gradient;
  ctx.beginPath();
  ctx.moveTo(width / 2, 0); // Top Center Peak (if curved, else flat)
  ctx.lineTo(width, 40); // Top Right
  ctx.lineTo(width, height - 80); // Bottom Right
  ctx.lineTo(width / 2, height); // Bottom Point
  ctx.lineTo(0, height - 80); // Bottom Left
  ctx.lineTo(0, 40); // Top Left
  ctx.closePath();
  ctx.fill();

  // Draw Inner Border/Glow
  ctx.lineWidth = 4;
  ctx.strokeStyle = cardType === 'ICON' ? '#D4AF37' : '#FFFFFF';
  ctx.stroke();

  // Dynamic Background Texture (Hexagons / Speed lines)
  ctx.globalAlpha = 0.15;
  for (let i = 0; i < 20; i++) {
    ctx.beginPath();
    ctx.moveTo(Math.random() * width, 0);
    ctx.lineTo(Math.random() * width, height);
    ctx.strokeStyle = '#FFFFFF';
    ctx.lineWidth = Math.random() * 5;
    ctx.stroke();
  }
  ctx.globalAlpha = 1.0;

  // Render Driver Image Cutout
  try {
    const driverImage = await loadImage(driver.cardUrl || 'https://i.imgur.com/placeholder_driver.png');
    // Draw driver spanning the right side of the card
    ctx.drawImage(driverImage, width * 0.2, 50, 280, 280);
  } catch (e) {
    // Fallback if image fails to load
    ctx.fillStyle = '#000';
    ctx.globalAlpha = 0.5;
    ctx.fillRect(width * 0.2, 50, 280, 280);
    ctx.globalAlpha = 1.0;
  }

  // Draw OVR Rating (Top Left, massive font)
  ctx.fillStyle = cardType === 'ICON' ? '#000000' : '#FFFFFF';
  ctx.font = 'bold 75px "Arial", sans-serif';
  ctx.textAlign = 'center';
  ctx.fillText(driver.rating, 85, 120);

  // Draw Series / Position (F1 / F2 / F3)
  ctx.font = 'bold 28px "Arial", sans-serif';
  ctx.fillText(driver.series, 85, 160);

  // Draw Division Line under Position
  ctx.beginPath();
  ctx.moveTo(40, 180);
  ctx.lineTo(130, 180);
  ctx.lineWidth = 2;
  ctx.strokeStyle = ctx.fillStyle;
  ctx.stroke();

  // Render Nation Flag Placeholder (Top Left below Line)
  try {
    // In production, map driver.nation to a flag URL. Using a generic rectangle here.
    const flagImg = await loadImage('https://i.imgur.com/flag_placeholder.png');
    ctx.drawImage(flagImg, 55, 195, 60, 40);
  } catch (e) {
    ctx.fillStyle = '#3498DB'; // Fallback color
    ctx.fillRect(55, 195, 60, 40);
  }

  // Render Team Logo Placeholder (Top Left below Flag)
  try {
    const logoImg = await loadImage('https://i.imgur.com/team_logo_placeholder.png');
    ctx.drawImage(logoImg, 55, 250, 60, 60);
  } catch (e) {
    ctx.fillStyle = '#E74C3C'; // Fallback color
    ctx.beginPath();
    ctx.arc(85, 280, 30, 0, Math.PI * 2);
    ctx.fill();
  }

  // Draw Driver Name (Bottom Center)
  ctx.fillStyle = cardType === 'ICON' ? '#000000' : '#FFFFFF';
  ctx.font = 'bold 42px "Arial", sans-serif';
  ctx.textAlign = 'center';
  // Standardize name formatting (Last Name usually bolded in FC)
  const nameParts = driver.name.split(' ');
  const lastName = nameParts[nameParts.length - 1].toUpperCase();
  ctx.fillText(lastName, width / 2, 380);

  // Draw Horizontal Separator below Name
  ctx.beginPath();
  ctx.moveTo(50, 400);
  ctx.lineTo(width - 50, 400);
  ctx.lineWidth = 2;
  ctx.strokeStyle = ctx.fillStyle;
  ctx.globalAlpha = 0.5;
  ctx.stroke();
  ctx.globalAlpha = 1.0;

  // --------------------------------------------------------------------------
  // STATS GRID (FC 26 Style: 2 Columns x 3 Rows)
  // Format:
  // PAC (Pace)       TYR (Tyre Mgt)
  // CON (Consistent) DEF (Defending)
  // EXP (Experience) AWA (Awareness)
  // --------------------------------------------------------------------------
  ctx.font = 'bold 26px "Arial", sans-serif';
  ctx.textAlign = 'left';
  
  // Calculate derived stats for visual flavor
  const pac = driver.pace;
  const con = driver.consistency;
  const exp = driver.exp;
  const tyr = Math.min(99, Math.round((driver.consistency + driver.exp) / 2));
  const def = Math.min(99, Math.round(driver.pace * 0.9));
  const awa = Math.min(99, Math.round(driver.rating * 1.05));

  const statColor = cardType === 'ICON' ? '#000000' : '#FFFFFF';
  
  // Left Column (PAC, CON, EXP)
  const col1X = 60;
  const col1LabelX = 110;
  
  // Right Column (TYR, DEF, AWA)
  const col2X = 220;
  const col2LabelX = 270;

  // Row 1 (Y: 440)
  ctx.fillText(pac, col1X, 440);
  ctx.font = 'normal 22px "Arial", sans-serif';
  ctx.fillText("PAC", col1LabelX, 440);
  ctx.font = 'bold 26px "Arial", sans-serif';
  ctx.fillText(tyr, col2X, 440);
  ctx.font = 'normal 22px "Arial", sans-serif';
  ctx.fillText("TYR", col2LabelX, 440);

  // Row 2 (Y: 480)
  ctx.font = 'bold 26px "Arial", sans-serif';
  ctx.fillText(con, col1X, 480);
  ctx.font = 'normal 22px "Arial", sans-serif';
  ctx.fillText("CON", col1LabelX, 480);
  ctx.font = 'bold 26px "Arial", sans-serif';
  ctx.fillText(def, col2X, 480);
  ctx.font = 'normal 22px "Arial", sans-serif';
  ctx.fillText("DEF", col2LabelX, 480);

  // Row 3 (Y: 520)
  ctx.font = 'bold 26px "Arial", sans-serif';
  ctx.fillText(exp, col1X, 520);
  ctx.font = 'normal 22px "Arial", sans-serif';
  ctx.fillText("EXP", col1LabelX, 520);
  ctx.font = 'bold 26px "Arial", sans-serif';
  ctx.fillText(awa, col2X, 520);
  ctx.font = 'normal 22px "Arial", sans-serif';
  ctx.fillText("AWA", col2LabelX, 520);

  // Return the buffer to be sent as a Discord Attachment
  return canvas.toBuffer('image/png');
}

// ----------------------------------------------------------------------------
// 2. TEAM LINEUP VISUALIZER (3 CARDS COMPOSITE)
// ----------------------------------------------------------------------------
async function generateTeamLineupImage(userState) {
  // Composite image holding up to 3 Driver Cards (Primary, Secondary, Reserve)
  const width = 1300;
  const height = 700;
  const canvas = createCanvas(width, height);
  const ctx = canvas.getContext('2d');

  // Background for the team lineup screen
  const gradient = ctx.createLinearGradient(0, 0, 0, height);
  gradient.addColorStop(0, '#1A1A1D'); // Very dark grey
  gradient.addColorStop(1, '#0C0C0E'); // Pitch black
  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, width, height);

  // Add subtle grid background pattern
  ctx.strokeStyle = '#333333';
  ctx.lineWidth = 1;
  for (let i = 0; i < width; i += 50) {
    ctx.beginPath(); ctx.moveTo(i, 0); ctx.lineTo(i, height); ctx.stroke();
  }
  for (let j = 0; j < height; j += 50) {
    ctx.beginPath(); ctx.moveTo(0, j); ctx.lineTo(width, j); ctx.stroke();
  }

  // Draw Team Header Info
  ctx.fillStyle = '#FFFFFF';
  ctx.font = 'bold 48px "Arial", sans-serif';
  ctx.textAlign = 'center';
  ctx.fillText(`🏁 ${userState.teamName.toUpperCase()} LINEUP 🏁`, width / 2, 70);
  
  ctx.fillStyle = '#2ECC71';
  ctx.font = 'bold 28px "Arial", sans-serif';
  ctx.fillText(`Operating Budget: $${(userState.budget / 1000000).toFixed(2)}M | Reputation: ${userState.reputation}/100`, width / 2, 110);

  // Fetch Drivers
  const d1 = userState.drivers.primary;
  const d2 = userState.drivers.secondary;
  const d3 = userState.drivers.reserve;

  // Helper to draw empty slot
  function drawEmptySlot(x, y, label) {
    ctx.fillStyle = '#2A2A30';
    ctx.strokeStyle = '#555555';
    ctx.lineWidth = 4;
    ctx.setLineDash([10, 10]);
    
    // Draw Shield Shape for Empty Slot
    ctx.beginPath();
    ctx.moveTo(x + 200, y);
    ctx.lineTo(x + 400, y + 40);
    ctx.lineTo(x + 400, y + 560 - 80);
    ctx.lineTo(x + 200, y + 560);
    ctx.lineTo(x, y + 560 - 80);
    ctx.lineTo(x, y + 40);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();
    
    ctx.setLineDash([]);
    ctx.fillStyle = '#777777';
    ctx.textAlign = 'center';
    ctx.font = 'bold 36px "Arial", sans-serif';
    ctx.fillText(label, x + 200, y + 280);
    ctx.font = 'normal 24px "Arial", sans-serif';
    ctx.fillText("NO DRIVER SIGNED", x + 200, y + 320);
  }

  // Generate and draw individual cards
  const cardY = 130;
  
  if (d1) {
    const cardBuffer1 = await generateFC26DriverCard(d1, d1.rating >= 90 ? 'ICON' : 'RARE_GOLD');
    const cardImg1 = await loadImage(cardBuffer1);
    ctx.drawImage(cardImg1, 50, cardY, 350, 490);
  } else {
    drawEmptySlot(50, cardY, "PRIMARY DRIVER");
  }

  if (d2) {
    const cardBuffer2 = await generateFC26DriverCard(d2, d2.rating >= 90 ? 'ICON' : 'RARE_GOLD');
    const cardImg2 = await loadImage(cardBuffer2);
    ctx.drawImage(cardImg2, 475, cardY, 350, 490);
  } else {
    drawEmptySlot(475, cardY, "SECONDARY DRIVER");
  }

  if (d3) {
    const cardBuffer3 = await generateFC26DriverCard(d3, d3.series === 'F1' ? 'RARE_GOLD' : 'ROOKIE');
    const cardImg3 = await loadImage(cardBuffer3);
    ctx.drawImage(cardImg3, 900, cardY, 350, 490);
  } else {
    drawEmptySlot(900, cardY, "RESERVE DRIVER");
  }

  return canvas.toBuffer('image/png');
}

// ----------------------------------------------------------------------------
// 3. FINANCIAL ENGINE & COST CAP AUDITOR
// ----------------------------------------------------------------------------
const FINANCIAL_ENGINE = {
  // Process post-race revenue streams
  processRaceWeekendFinances: function(userState, resultPosD1, resultPosD2) {
    let income = 0;
    
    // 1. Basic FIA Race Participation TV Money
    income += 2500000;

    // 2. Performance Prize Money Pool
    const payoutStructure = {
      1: 5000000, 2: 4000000, 3: 3500000, 4: 3000000, 5: 2500000,
      6: 2000000, 7: 1500000, 8: 1000000, 9: 750000, 10: 500000
    };
    if (payoutStructure[resultPosD1]) income += payoutStructure[resultPosD1];
    if (payoutStructure[resultPosD2]) income += payoutStructure[resultPosD2];

    // 3. Merchandising Revenue (Based on driver popularity & team reputation)
    const merchRevenue = (userState.reputation * 15000) + 
                         (userState.drivers.primary ? userState.drivers.primary.rating * 8000 : 0);
    income += merchRevenue;

    // 4. Operating Expenses Deduction (Travel, Freight, Hospitality)
    const operatingExpenses = 1800000;
    
    // Apply Net Transaction
    const netProfit = income - operatingExpenses;
    userState.budget += netProfit;

    return {
      grossIncome: income,
      expenses: operatingExpenses,
      net: netProfit,
      merch: merchRevenue
    };
  },

  // Weekly Staff & Facility Maintenance Deductions
  processWeeklyDeductions: function(userState) {
    let weeklyCost = 500000; // Base Headquarters Cost

    // Deduct facility tier maintenance
    const totalFacilityCost = (userState.upgradesInstalled.length * 150000);
    weeklyCost += totalFacilityCost;

    userState.budget -= weeklyCost;
    return weeklyCost;
  }
};

// ----------------------------------------------------------------------------
// 4. INTERACTION HANDLERS FOR TEAM HUB
// ----------------------------------------------------------------------------
async function handleTeamInteractions(interaction) {
  const userId = interaction.user.id;
  const userState = gameStates.get(userId);

  if (!userState) {
    return interaction.reply({ content: "❌ You have not created a team yet! Use `/team`.", ephemeral: true });
  }

  // Handle Button Clicks from Team Hub UI
  if (interaction.isButton()) {
    const customId = interaction.customId;

    if (customId === 'team_view_lineup') {
      await interaction.deferReply();
      
      // Generate the massive FC 26 Lineup Graphic
      const imageBuffer = await generateTeamLineupImage(userState);
      const attachment = new AttachmentBuilder(imageBuffer, { name: 'team_lineup_fc26.png' });

      const embed = new EmbedBuilder()
        .setTitle(`📸 Media Day: ${userState.teamName} Driver Lineup`)
        .setColor(0x00D26A)
        .setDescription("Official EA SPORTS FC 26 Ultimate Team Style Lineup Cards generated successfully.")
        .setImage('attachment://team_lineup_fc26.png')
        .setFooter({ text: "F1 Manager Graphics Engine" });

      return interaction.followUp({ embeds: [embed], files: [attachment] });
    }

    if (customId === 'team_financial_ledger') {
      const projectedIncome = FINANCIAL_ENGINE.processRaceWeekendFinances(userState, 1, 1).grossIncome; // Optimistic projection
      
      const embed = new EmbedBuilder()
        .setTitle(`🏦 Financial Audit: ${userState.teamName}`)
        .setColor(0xF1C40F)
        .addFields(
          { name: "💵 Current Cash Reserves", value: `$${(userState.budget / 1000000).toFixed(2)}M`, inline: false },
          { name: "📈 Projected Race Income (P1, P2)", value: `+$${(projectedIncome / 1000000).toFixed(2)}M`, inline: true },
          { name: "📉 Projected Overhead Costs", value: `-$1.80M`, inline: true },
          { name: "🛒 Active Merchandising Rep", value: `${userState.reputation} Index`, inline: true }
        )
        .setFooter({ text: "FIA Cost Cap Regulatory System Active" });

      return interaction.reply({ embeds: [embed], ephemeral: true });
    }

    if (customId === 'team_generate_solo_card') {
      if (!userState.drivers.primary) {
        return interaction.reply({ content: "❌ You do not have a primary driver signed to generate a card for.", ephemeral: true });
      }

      await interaction.deferReply();
      
      const soloCardBuffer = await generateFC26DriverCard(userState.drivers.primary, 'RARE_GOLD');
      const attachment = new AttachmentBuilder(soloCardBuffer, { name: 'solo_driver_card.png' });

      return interaction.followUp({ 
        content: `**${userState.drivers.primary.name}** Ultimate Team Card Rendered!`, 
        files: [attachment] 
      });
    }
  }
}

// ----------------------------------------------------------------------------
// 5. EXPORTS
// ----------------------------------------------------------------------------
module.exports = {
  generateFC26DriverCard,
  generateTeamLineupImage,
  FINANCIAL_ENGINE,
  handleTeamInteractions
};
