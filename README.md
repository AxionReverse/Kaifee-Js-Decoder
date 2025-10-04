# Kaifee-Js-Decoder
Node.js decoder for emoji-mapped obfuscation. Payloads protected by Kaifee via emoji→Base64→XOR→hex-cleanup→ROT13→reverse. Decoder (AxionReverse) auto-parses the file’s emoji→character map, decodes emoji sequences, and applies inverse operations to reconstruct the original payload.

<div align="center">
  <h1 style="font-size:24px; color:#FF6719; text-shadow:2px 2px 4px rgba(0,0,0,0.5);">Decoder</h1>
</div>

## Installation (Termux / Android)

Open Termux and run:

```bash
# update & upgrade
apt update && apt upgrade -y

# install Node.js
pkg install nodejs

# give storage permission
termux-setup-storage
# usages
node decoder.js <inputFile.js> <outputFile.js>
