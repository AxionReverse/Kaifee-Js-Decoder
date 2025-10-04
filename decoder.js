// decoder.js
// developer @AxionReverse

const fs = require('fs');
const path = require('path');

const args = process.argv.slice(2);
if (args.length < 2) {
  console.error("Usage: node decoder.js <inputFile> <outputFile>");
  process.exit(1);
}

const inputFile = path.resolve(args[0]);
const outputFile = path.resolve(args[1]);

if (!fs.existsSync(inputFile)) {
  console.error(`Input file not found: ${inputFile}`);
  process.exit(1);
}

const content = fs.readFileSync(inputFile, 'utf8');

function regexGrab(pattern, text) {
  const m = text.match(pattern);
  return m ? m[1] : '';
}

const emojiEncodedKey1 = regexGrab(/emojiEncodedKey1\s*=\s*['"]([^'"]+)['"]/, content) || '';
const emojiEncodedKey2 = regexGrab(/emojiEncodedKey2\s*=\s*['"]([^'"]+)['"]/, content) || '';
const emojiEncodedData = regexGrab(/emojiEncodedData\s*=\s*['"]([^'"]+)['"]/, content) || '';

if (!emojiEncodedKey1 || !emojiEncodedKey2 || !emojiEncodedData) {
  console.error('Failed to extract encoded values');
  process.exit(1);
}

function extractEmojiMapping(fileContent) {
  const mappingBlock =
    fileContent.match(/\$?emojiMapping\s*=\s*(?:array\s*\(|\{)([\s\S]*?)(?:\}|\);)/);

  if (!mappingBlock) {
    console.error(' No emoji mapping found');
    process.exit(1);
  }

  const rawBlock = mappingBlock[1];
  const emojiMapping = {};

  const regex = /['"]([A-Za-z0-9])['"]\s*(?:=>|:)\s*['"]([^'"]+)['"]/g;
  let match;
  while ((match = regex.exec(rawBlock)) !== null) {
    emojiMapping[match[1]] = match[2];
  }

  if (Object.keys(emojiMapping).length === 0) {
    console.error('Failed to parse emoji mapping');
    process.exit(1);
  }

  return emojiMapping;
}

const emojiMapping = extractEmojiMapping(content);

const emojiReverseMapping = {};
for (const k in emojiMapping) emojiReverseMapping[emojiMapping[k]] = k;

function emojiDecode(emojiString, reverseMap) {
  const arr = Array.from(emojiString);
  return arr.map(ch => reverseMap[ch] ?? ch).join('');
}

try {
  const key1_base64 = emojiDecode(emojiEncodedKey1, emojiReverseMapping);
  const key2_base64 = emojiDecode(emojiEncodedKey2, emojiReverseMapping);
  const base64Data = emojiDecode(emojiEncodedData, emojiReverseMapping);

  const key1 = Buffer.from(key1_base64, 'base64');
  const key2 = Buffer.from(key2_base64, 'base64');
  const encrypted2 = Buffer.from(base64Data, 'base64');

  const step7Buf = Buffer.alloc(encrypted2.length);
  for (let i = 0; i < encrypted2.length; i++) {
    step7Buf[i] = encrypted2[i] ^ key2[i % key2.length];
  }

  const step7AsLatin1 = step7Buf.toString('latin1');
  const hexEncodedBuf = Buffer.from(step7AsLatin1, 'base64');
  const hexEncodedStr = hexEncodedBuf.toString('utf8');

  let cleanHexStr = '';
  for (let i = 0; i < hexEncodedStr.length; i += 3) {
    cleanHexStr += hexEncodedStr.substr(i, 2);
  }

  const bytes = [];
  for (let i = 0; i < cleanHexStr.length; i += 2) {
    const hexPair = cleanHexStr.substr(i, 2);
    if (hexPair.length === 2) bytes.push(parseInt(hexPair, 16));
  }
  const encrypted1 = Buffer.from(bytes);

  const decryptedStep4Buf = Buffer.alloc(encrypted1.length);
  for (let i = 0; i < encrypted1.length; i++) {
    decryptedStep4Buf[i] = encrypted1[i] ^ key1[i % key1.length];
  }

  const decryptedStr = decryptedStep4Buf.toString('latin1');
  const lastStar = decryptedStr.lastIndexOf('*');
  if (lastStar === -1) {
    console.error("Could not find terminating in decrypted data.");
    process.exit(1);
  }
  const coreDataStr = decryptedStr.substring(16, lastStar);

  const reversed = Array.from(coreDataStr).reverse().join('');
  function rot13(s) {
    return s.replace(/[A-Za-z]/g, c => {
      const base = c <= 'Z' ? 65 : 97;
      return String.fromCharCode(((c.charCodeAt(0) - base + 13) % 26) + base);
    });
  }
  const rot13Decoded = rot13(reversed);
  const finalBuf = Buffer.from(rot13Decoded, 'base64');

  fs.writeFileSync(outputFile, finalBuf);
  console.log(`Decryption complete!\nInput: ${path.basename(inputFile)}\nOutput: ${path.basename(outputFile)}`);
} catch (err) {
  console.error('Error during decryption:', err.message);
  process.exit(1);
}