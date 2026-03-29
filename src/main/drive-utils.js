const { execSync } = require('child_process');

function getAvailableDriveLetters() {
  const used = new Set();
  try {
    const output = execSync('wmic logicaldisk get name', { encoding: 'utf8', shell: true });
    output.split('\n').forEach(line => {
      const match = line.trim().match(/^([A-Z]):$/);
      if (match) used.add(match[1]);
    });
  } catch {
    // Assume C is used at minimum
    used.add('C');
  }

  // Skip A, B (floppy), C (system)
  const skip = new Set(['A', 'B', 'C']);
  const available = [];

  // Go from Z downward so preferred letters (V, W, X, Y, Z) appear first
  for (let code = 90; code >= 68; code--) { // Z=90, D=68
    const letter = String.fromCharCode(code);
    if (!used.has(letter) && !skip.has(letter)) {
      available.push(letter + ':');
    }
  }

  // Put V: first if available, otherwise keep Z-D order
  const vIndex = available.indexOf('V:');
  if (vIndex > 0) {
    available.splice(vIndex, 1);
    available.unshift('V:');
  }

  return available;
}

module.exports = { getAvailableDriveLetters };
