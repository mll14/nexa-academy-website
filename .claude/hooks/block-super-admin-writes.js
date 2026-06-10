// Requires explicit confirmation before writing to super-admin app
const input = JSON.parse(process.argv[2] || '{}');
const path = input?.tool_input?.path || '';

if (path.includes('apps/super-admin') && !process.env.SUPER_ADMIN_CONFIRMED) {
  console.error(
    'HOOK BLOCKED: Writing to super-admin requires SUPER_ADMIN_CONFIRMED=1 env var set.'
  );
  process.exit(2);
}
process.exit(0);