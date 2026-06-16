// Minimal PNG generator for PWA icons
// Creates solid-color rounded-square icons with a simple "K" letter
var fs = require('fs');
var path = require('path');

var outdir = path.join(__dirname, 'icons');
if (!fs.existsSync(outdir)) fs.mkdirSync(outdir, { recursive: true });

// Minimal PNG with zlib-compressed IDAT
var zlib = require('zlib');

function createPNG(size, r, g, b) {
  // IHDR data
  var ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(size, 0);   // width
  ihdr.writeUInt32BE(size, 4);   // height
  ihdr.writeUInt8(8, 8);         // bit depth
  ihdr.writeUInt8(2, 9);         // color type (RGB)
  ihdr.writeUInt8(0, 10);        // compression
  ihdr.writeUInt8(0, 11);        // filter
  ihdr.writeUInt8(0, 12);        // interlace

  // Raw image data with filter byte per row
  var raw = Buffer.alloc(size * (1 + size * 3));
  for (var y = 0; y < size; y++) {
    var off = y * (1 + size * 3);
    raw[off] = 0; // filter byte = None
    for (var x = 0; x < size; x++) {
      var px = off + 1 + x * 3;
      // Simple rounded square (radius = size * 0.2)
      var cx = x - size / 2;
      var cy = y - size / 2;
      var rad = size * 0.45;
      var dist = Math.sqrt(cx * cx + cy * cy);
      if (dist < rad) {
        // Inside circle - use brand color
        raw[px] = r;
        raw[px + 1] = g;
        raw[px + 2] = b;
      } else if (dist < rad + 2) {
        // Anti-alias edge
        var alpha = Math.max(0, 1 - (dist - rad));
        raw[px] = Math.round(248 + (r - 248) * alpha);
        raw[px + 1] = Math.round(250 + (g - 250) * alpha);
        raw[px + 2] = Math.round(252 + (b - 252) * alpha);
      } else {
        // Outside - white/transparent
        raw[px] = 248;
        raw[px + 1] = 250;
        raw[px + 2] = 252;
      }
    }
  }
  return raw;
}

function crc32(buf) {
  var crc = 0xFFFFFFFF;
  for (var i = 0; i < buf.length; i++) {
    crc ^= buf[i];
    for (var j = 0; j < 8; j++) {
      crc = (crc >>> 1) ^ (crc & 1 ? 0xEDB88320 : 0);
    }
  }
  return (crc ^ 0xFFFFFFFF) >>> 0;
}

function chunk(type, data) {
  var len = Buffer.alloc(4);
  len.writeUInt32BE(data.length, 0);
  var typeB = Buffer.from(type, 'ascii');
  var combined = Buffer.concat([typeB, data]);
  var crcB = Buffer.alloc(4);
  crcB.writeUInt32BE(crc32(combined), 0);
  return Buffer.concat([len, typeB, data, crcB]);
}

function generateIcon(size, r, g, b, fname) {
  var sig = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]);

  var ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(size, 0);
  ihdr.writeUInt32BE(size, 4);
  ihdr.writeUInt8(8, 8);
  ihdr.writeUInt8(2, 9);
  ihdr.writeUInt8(0, 10);
  ihdr.writeUInt8(0, 11);
  ihdr.writeUInt8(0, 12);

  var raw = createPNG(size, r, g, b);
  var compressed = zlib.deflateSync(raw);

  var iend = Buffer.alloc(0);

  var png = Buffer.concat([
    sig,
    chunk('IHDR', ihdr),
    chunk('IDAT', compressed),
    chunk('IEND', iend)
  ]);

  fs.writeFileSync(path.join(outdir, fname), png);
  console.log('Created ' + fname + ' (' + size + 'x' + size + ')');
}

// Brand colors
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
