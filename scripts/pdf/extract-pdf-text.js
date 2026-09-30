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

// PDF text is written as WinAnsi (CP1252); latin1 decoding mangles 0x80-0x9F.
const CP1252_HIGH = {
  0x80: '\u20AC', 0x82: '\u201A', 0x83: '\u0192', 0x84: '\u201E',
  0x85: '\u2026', 0x86: '\u2020', 0x87: '\u2021', 0x88: '\u02C6',
  0x89: '\u2030', 0x8a: '\u0160', 0x8b: '\u2039', 0x8c: '\u0152',
  0x8e: '\u017D', 0x91: '\u2018', 0x92: '\u2019', 0x93: '\u201C',
  0x94: '\u201D', 0x95: '\u2022', 0x96: '\u2013', 0x97: '\u2014',
  0x98: '\u02DC', 0x99: '\u2122', 0x9a: '\u0161', 0x9b: '\u203A',
  0x9c: '\u0153', 0x9e: '\u017E', 0x9f: '\u0178',
};

function decodeWinAnsi(s) {
  return s.replace(/[\u0080-\u009F]/g, (c) => CP1252_HIGH[c.charCodeAt(0)] || c);
}

function decodeHtmlEntities(s) {
  return s
    .replace(/&#x27;/g, "'")
    .replace(/&#39;/g, "'")
    .replace(/&quot;/g, '"')
    .replace(/&nbsp;/g, ' ')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&amp;/g, '&');
}

// Usage: node extract-pdf-text.js <file.pdf> [...] [-o out.md]
const args = process.argv.slice(2);
const outIndex = args.indexOf('-o');
const outPath = outIndex === -1 ? null : args[outIndex + 1];
const files = outIndex === -1 ? args : args.slice(0, outIndex);

let result = '';
for (const f of files) {
  result += '===== ' + f + ' =====\n';
  result += decodeHtmlEntities(decodeWinAnsi(extractText(f))) + '\n\n';
}

if (outPath) {
  // Write directly; piping through a shell can re-encode non-ASCII output.
  fs.writeFileSync(outPath, result, 'utf8');
  console.log('Wrote ' + outPath);
} else {
  console.log(result);
}
