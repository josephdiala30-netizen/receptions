// PWA Icon generator using canvas
var fs = require('fs');
var path = require('path');
var { createCanvas } = require('canvas');

var outdir = path.join(__dirname, 'icons');
if (!fs.existsSync(outdir)) fs.mkdirSync(outdir, { recursive: true });

function generateIcon(size, r, g, b, fname) {
  var canvas = createCanvas(size, size);
  var ctx = canvas.getContext('2d');

  // Background rounded rect
  var rad = size * 0.22;
  ctx.beginPath();
  ctx.moveTo(rad, 0);
  ctx.lineTo(size - rad, 0);
  ctx.quadraticCurveTo(size, 0, size, rad);
  ctx.lineTo(size, size - rad);
  ctx.quadraticCurveTo(size, size, size - rad, size);
  ctx.lineTo(rad, size);
  ctx.quadraticCurveTo(0, size, 0, size - rad);
  ctx.lineTo(0, rad);
  ctx.quadraticCurveTo(0, 0, rad, 0);
  ctx.closePath();

  var grad = ctx.createLinearGradient(0, 0, size, size);
  grad.addColorStop(0, 'rgb(' + r + ',' + g + ',' + b + ')');
  grad.addColorStop(1, 'rgb(' + Math.round(r*0.78) + ',' + Math.round(g*0.7) + ',' + Math.round(b*0.85) + ')');
  ctx.fillStyle = grad;
  ctx.fill();

  // White "K" letter
  ctx.fillStyle = 'white';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  var fontSize = Math.round(size * 0.55);
  ctx.font = 'bold ' + fontSize + 'px Inter, sans-serif';
  ctx.shadowColor = 'rgba(0,0,0,0.15)';
  ctx.shadowBlur = Math.round(size * 0.04);
  ctx.fillText('K', size/2, size/2 + Math.round(size * 0.02));

  var buf = canvas.toBuffer('image/png');
  fs.writeFileSync(path.join(outdir, fname), buf);
  console.log('Created ' + fname + ' (' + size + 'x' + size + ') - ' + buf.length + ' bytes');
}

var colors = {
  'icon-192': { size: 192, r: 99, g: 102, b: 241 },
  'icon-512': { size: 512, r: 99, g: 102, b: 241 },
  'icon-it': { size: 96, r: 99, g: 102, b: 241 },
  'icon-task': { size: 96, r: 16, g: 185, b: 129 },
  'icon-path': { size: 96, r: 234, g: 88, b: 12 },
  'icon-admin': { size: 96, r: 2, g: 132, b: 199 }
};

Object.keys(colors).forEach(function(k) {
  var c = colors[k];
  generateIcon(c.size, c.r, c.g, c.b, k + '.png');
});

console.log('All icons generated!');
