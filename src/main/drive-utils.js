const fs = require('fs');

function getAvailableDriveLetters() {
  const used = new Set();

  // Fast check: just see which drive letters have a root directory
  for (let code = 65; code <= 90; code++) { // A-Z
    const letter = String.fromCharCode(code);
    try {
      if (fs.existsSync(letter + ':\\')) {
        used.add(letter);
      }
    } catch {
      // ignore
    }
  }

  // Skip A, B (floppy), C (system)
  const skip = new Set(['A', 'B', 'C']);
  const available = [];

  // Go from Z downward so preferred letters appear first
  for (let code = 90; code >= 68; code--) { // Z=90, D=68
    const letter = String.fromCharCode(code);
    if (!used.has(letter) && !skip.has(letter)) {
      available.push(letter + ':');
    }
  }

  // Put V: first if available
  const vIndex = available.indexOf('V:');
  if (vIndex > 0) {
    available.splice(vIndex, 1);
    available.unshift('V:');
  }

  return available;
}

module.exports = { getAvailableDriveLetters };
