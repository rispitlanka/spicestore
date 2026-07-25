import fs from 'node:fs'
import path from 'node:path'

const envPath = path.resolve(process.cwd(), '.env.local')
if (fs.existsSync(envPath)) {
  console.log('Env local contents:')
  console.log(fs.readFileSync(envPath, 'utf8'))
}

console.log('Process env keys:', Object.keys(process.env).filter(k => k.includes('POSTGRES') || k.includes('DATABASE') || k.includes('SUPABASE') || k.includes('SQL')))
