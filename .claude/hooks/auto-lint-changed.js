// Auto-lint after every file write — zero token cost
const { execSync } = require('child_process');
const input = JSON.parse(process.argv[2] || '{}');
const file = input?.tool_input?.path || '';

if (file.endsWith('.ts') || file.endsWith('.tsx')) {
  try {
    execSync(`pnpm eslint "${file}" --fix --quiet`, { stdio: 'inherit' });
  } catch {
    // lint errors are informational, don't block
  }
}
process.exit(0);