const fs = require('fs');
const zlib = require('zlib');

function extractText(pdfPath) {
  const buf = fs.readFileSync(pdfPath);
  const raw = buf.toString('latin1');
  const streamRe = /stream\r?\n([\s\S]*?)\r?\nendstream/g;
  let m;
  let text = '';
  while ((m = streamRe.exec(raw)) !== null) {
    const streamData = Buffer.from(m[1], 'latin1');
    let content;
    try {
      content = zlib.inflateSync(streamData).toString('latin1');
    } catch {
      content = streamData.toString('latin1');
    }
    // Extract text show operators: (text)Tj  or  [(text)(text)]TJ  or hex <..>Tj
    const tjRe = /\(((?:[^()\\]|\\.)*)\)\s*Tj/g;
    const arrRe = /\[((?:[^\[\]]|\\.)*)\]\s*TJ/g;
    const hexTjRe = /<([0-9A-Fa-f\s]+)>\s*Tj/g;
    let tm;
    while ((tm = tjRe.exec(content)) !== null) {
      text += unescapePdfString(tm[1]) + ' ';
    }
    while ((tm = arrRe.exec(content)) !== null) {
      const inner = tm[1];
      const partRe = /\(((?:[^()\\]|\\.)*)\)/g;
      const hexPartRe = /<([0-9A-Fa-f\s]+)>/g;
      let pm;
      while ((pm = partRe.exec(inner)) !== null) {
        text += unescapePdfString(pm[1]);
      }
      while ((pm = hexPartRe.exec(inner)) !== null) {
        text += hexToText(pm[1]);
      }
      text += ' ';
    }
    while ((tm = hexTjRe.exec(content)) !== null) {
      text += hexToText(tm[1]) + ' ';
    }
  }
  return text;
}

function hexToText(hex) {
  const clean = hex.replace(/\s+/g, '');
  let out = '';
  for (let i = 0; i < clean.length; i += 2) {
    const code = parseInt(clean.substr(i, 2), 16);
    if (!Number.isNaN(code)) out += String.fromCharCode(code);
  }
  return out;
}

function unescapePdfString(s) {
  return s
    .replace(/\\n/g, '\n')
    .replace(/\\r/g, '')
    .replace(/\\\(/g, '(')
    .replace(/\\\)/g, ')')
    .replace(/\\\\/g, '\\');
}

const files = process.argv.slice(2);
for (const f of files) {
  console.log('===== ' + f + ' =====');
  console.log(extractText(f));
  console.log('\n');
}
