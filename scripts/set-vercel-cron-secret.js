// One-off: set CRON_SECRET in Vercel (production + preview) with a
// clean hex value (no trailing newline). Uses the Vercel CLI's
// stdin path. The sensitive flag makes the value encrypted at rest.

const { spawn } = require('child_process')
const crypto = require('crypto')

const secret = crypto.randomBytes(32).toString('hex')
console.log('Setting CRON_SECRET to:', secret)

function run(args, input) {
  return new Promise((resolve, reject) => {
    const child = spawn(
      'npx',
      ['vercel', ...args],
      { stdio: ['pipe', 'inherit', 'inherit'], shell: true, windowsHide: true }
    )
    child.stdin.write(input)
    child.stdin.end()
    child.on('close', (code) => {
      if (code === 0) resolve()
      else reject(new Error(`exit ${code}`))
    })
  })
}

;(async () => {
  for (const env of ['production', 'preview']) {
    // The CLI's stdin sequence with --sensitive is:
    //   1. (no prompt for sensitive, it's a flag)
    //   2. "What's the value of CRON_SECRET?" -> stdin
    //   3. (no other prompts if --yes and --force)
    await run(['env', 'add', 'CRON_SECRET', env, '--sensitive', '--force', '--yes'], secret)
    console.log(`  -> ${env} OK`)
  }
})().catch((err) => {
  console.error('Failed:', err.message)
  process.exit(1)
})
