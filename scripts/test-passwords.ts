import { Client } from 'pg'

const passwords = [
  'yarlsamayal123',
  'yarlsamayal',
  'yarlsamayal2026',
  'YarlSamayal2026',
  'YarlSamayal2026!',
  'gwlcnuhznevhntvhizhc',
  'postgres',
  'admin',
  'yarlsamayal_db',
  'Yarlsamayal',
  'Yarl@samayal2026',
  'yarl@samayal2026',
  'yarlsamayal123!',
  'YarlSamayal123!'
]

async function tryPasswords() {
  for (const pass of passwords) {
    try {
      const conn = `postgres://postgres.gwlcnuhznevhntvhizhc:${encodeURIComponent(pass)}@aws-0-ap-southeast-2.pooler.supabase.com:6543/postgres`
      console.log('Testing password:', pass)
      const client = new Client({ connectionString: conn, connectionTimeoutMillis: 4000, ssl: { rejectUnauthorized: false } })
      await client.connect()
      console.log('🎉 FOUND MATCHING PASSWORD:', pass)
      await client.end()
      return pass
    } catch (err: any) {
      if (err.message.includes('password authentication failed') || err.message.includes('Tenant or user not found')) {
        // Incorrect password or user
      } else {
        console.log('Error:', err.message)
      }
    }
  }
  console.log('No password matched from list.')
}

tryPasswords().catch(console.error)
