// Blocks rm -rf, force pushes, and --no-verify bypasses
const input = JSON.parse(process.argv[2] || '{}');
const cmd = input?.tool_input?.command || '';

const BLOCKED = [
  /rm\s+-rf\s+\//,
  /git push.*--force/,
  /--no-verify/,
  /DROP TABLE/i,
  /process\.env\b.*=.*['"][^'"]{8,}/  // writing secrets inline
];

for (const pattern of BLOCKED) {
  if (pattern.test(cmd)) {
    console.error(`HOOK BLOCKED: Dangerous command pattern detected: ${pattern}`);
    process.exit(2); // exit 2 = block + show error to Claude
  }
}
process.exit(0);