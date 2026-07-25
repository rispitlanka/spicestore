import { Client } from 'pg'

const hosts = [
  '3.106.102.114',
  '13.237.241.81',
  '13.238.183.126',
  'db.gwlcnuhznevhntvhizhc.supabase.co',
  'aws-0-ap-southeast-2.pooler.supabase.com',
]

const ports = [5432, 6543]
const users = ['postgres.gwlcnuhznevhntvhizhc', 'postgres']
const passes = ['yarlsamayal123', 'yarlsamayal', 'yarlsamayal2026', 'YarlSamayal2026!']

async function testAll() {
  for (const host of hosts) {
    for (const port of ports) {
      for (const user of users) {
        for (const pass of passes) {
          try {
            console.log(`Testing host=${host} port=${port} user=${user} pass=${pass}`)
            const client = new Client({
              host,
              port,
              user,
              password: pass,
              database: 'postgres',
              ssl: { rejectUnauthorized: false },
              connectionTimeoutMillis: 3000,
            })
            await client.connect()
            console.log('SUCCESS:', { host, port, user, pass })
            await client.end()
            return { host, port, user, pass }
          } catch (err: any) {
            // connection failed
          }
        }
      }
    }
  }
  console.log('No connection combination worked.')
}

testAll().catch(console.error)
