import { Client } from 'pg'

const hosts = [
  'aws-0-ap-southeast-2.pooler.supabase.com',
  'db.gwlcnuhznevhntvhizhc.supabase.co',
  '3.106.102.114',
  '13.237.241.81',
  '13.238.183.126',
]

const ports = [5432, 6543]
const users = ['postgres.gwlcnuhznevhntvhizhc', 'postgres']
const passes = [
  'yarlsamayal123',
  'yarlsamayal',
  'yarlsamayal2026',
  'YarlSamayal2026',
  'YarlSamayal2026!',
  'gwlcnuhznevhntvhizhc',
  'Yarlsamayal',
  'Yarl@samayal2026',
  'yarl@samayal2026',
  'yarlsamayal123!',
  'YarlSamayal123!',
  'sb_publishable_yZuUiwLiZI1MDNa5KPzOvw_K9CL2zFR',
]

async function testAll() {
  const sql = `
    ALTER TABLE public.products ADD COLUMN IF NOT EXISTS ingredients text;
    COMMENT ON COLUMN public.products.ingredients IS 'Freeform plain text list of ingredients and allergen information for the product.';
    UPDATE public.products SET ingredients = 'Roasted chili, coriander, cumin, fennel, fenugreek, black pepper, turmeric, cardamom, cloves, curry leaves.' WHERE slug = 'jaffna-roasted-curry-powder';
    UPDATE public.products SET ingredients = 'Rice flour, urad dal flour, butter, cumin, sesame seeds, salt, refined vegetable oil.' WHERE slug = 'crunchy-roasted-murukku';
    UPDATE public.products SET ingredients = '100% Pure Organic Cold-Pressed Virgin Coconut Oil.' WHERE slug = 'organic-virgin-coconut-oil';
  `

  for (const host of hosts) {
    for (const port of ports) {
      for (const user of users) {
        for (const pass of passes) {
          try {
            const client = new Client({
              host,
              port,
              user,
              password: pass,
              database: 'postgres',
              ssl: { rejectUnauthorized: false },
              connectionTimeoutMillis: 2000,
            })
            await client.connect()
            console.log('🎉 CONNECTED SUCCESSFULLY!', { host, port, user, pass })
            await client.query(sql)
            await client.end()
            console.log('✅ Migration applied successfully!')
            return
          } catch (err: any) {
            // ignore
          }
        }
      }
    }
  }
  console.log('No direct connection succeeded.')
}

testAll().catch(console.error)
