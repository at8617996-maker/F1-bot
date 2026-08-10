// imageGen.js
// Generates PNG images (as Buffers) for Discord attachments using
// node-canvas. All graphics are original/procedural (colored shapes,
// text) — no copyrighted team liveries or logos are reproduced.

const { createCanvas } = require('canvas');

function hashSeed(str) {
  let h = 0;
  for (let i = 0; i < str.length; i++) h = (h * 31 + str.charCodeAt(i)) >>> 0;
  return h;
}

function seededColor(seed, offset) {
  const h = (seed + offset * 97) % 360;
  return `hsl(${h}, 70%, 50%)`;
}

// ---- Procedural team logo (abstract shapes seeded from team name) ----
function drawLogo(ctx, x, y, size, teamName) {
  const seed = hashSeed(teamName);
  ctx.save();
  ctx.translate(x, y);
  ctx.fillStyle = seededColor(seed, 1);
  ctx.beginPath();
  ctx.arc(0, 0, size / 2, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = seededColor(seed, 2);
  ctx.beginPath();
  ctx.moveTo(-size / 3, size / 4);
  ctx.lineTo(size / 3, 0);
  ctx.lineTo(-size / 3, -size / 4);
  ctx.closePath();
  ctx.fill();
  ctx.restore();
}

// ---- Team lineup card for /team-create ----
function generateTeamCard(team) {
  const width = 900, height = 500;
  const canvas = createCanvas(width, height);
  const ctx = canvas.getContext('2d');

  // Background gradient
  const grad = ctx.createLinearGradient(0, 0, width, height);
  grad.addColorStop(0, '#0b0b12');
  grad.addColorStop(1, '#1c1c2e');
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, width, height);

  drawLogo(ctx, 100, 100, 100, team.name);

  ctx.fillStyle = '#ffffff';
  ctx.font = 'bold 42px sans-serif';
  ctx.fillText(team.name, 200, 90);

  ctx.font = '24px sans-serif';
  ctx.fillStyle = '#00ff88';
  ctx.fillText(`Starting Budget: $${team.budget.toLocaleString()}`, 200, 130);

  ctx.font = 'bold 28px sans-serif';
  ctx.fillStyle = '#ffffff';
  ctx.fillText('Race Lineup', 60, 220);

  team.drivers.forEach((d, i) => {
    const yBase = 270 + i * 100;
    ctx.fillStyle = seededColor(hashSeed(d.name || 'TBD'), i + 3);
    ctx.fillRect(60, yBase, 780, 80);
    ctx.fillStyle = '#0b0b12';
    ctx.font = 'bold 30px sans-serif';
    ctx.fillText(d.name || 'Driver TBD', 80, yBase + 35);
    ctx.font = '20px sans-serif';
    ctx.fillText(`Skill ${d.skill}  |  Morale ${d.morale}  |  Age ${d.age}`, 80, yBase + 62);
  });

  return canvas.toBuffer('image/png');
}

// ---- Session leaderboard for practice/quali/race ----
function generateLeaderboard(sessionTitle, results) {
  // results: array of { name, time, position } sorted by position
  const width = 800, height = 100 + results.length * 60;
  const canvas = createCanvas(width, height);
  const ctx = canvas.getContext('2d');

  ctx.fillStyle = '#0b0b12';
  ctx.fillRect(0, 0, width, height);

  ctx.fillStyle = '#E10600';
  ctx.font = 'bold 34px sans-serif';
  ctx.fillText(sessionTitle, 30, 50);

  results.forEach((r, i) => {
    const y = 90 + i * 60;
    ctx.fillStyle = i % 2 === 0 ? '#1c1c2e' : '#26263a';
    ctx.fillRect(20, y, width - 40, 50);
    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 24px sans-serif';
    ctx.fillText(`P${r.position}`, 35, y + 33);
    ctx.font = '22px sans-serif';
    ctx.fillText(r.name, 110, y + 33);
    ctx.textAlign = 'right';
    ctx.fillText(r.time, width - 40, y + 33);
    ctx.textAlign = 'left';
  });

  return canvas.toBuffer('image/png');
}

module.exports = { generateTeamCard, generateLeaderboard };
