import fs from 'node:fs'
import path from 'node:path'
import { createClient } from '@supabase/supabase-js'

const envPath = path.resolve(process.cwd(), '.env.local')
if (fs.existsSync(envPath)) {
  const envContent = fs.readFileSync(envPath, 'utf8')
  envContent.split('\n').forEach((line) => {
    const trimmed = line.trim()
    if (trimmed && !trimmed.startsWith('#') && trimmed.includes('=')) {
      const idx = trimmed.indexOf('=')
      const key = trimmed.substring(0, idx).trim()
      const val = trimmed.substring(idx + 1).trim().replace(/^["']|["']$/g, '')
      process.env[key] = val
    }
  })
}

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY!
const supabase = createClient(supabaseUrl, supabaseKey)

const seedData = [
  {
    slug: 'privacy-policy',
    title: 'Privacy Policy',
    content: `<!-- Note for Siva: Please review and edit before relying on this text legally. -->

# Privacy Policy

Welcome to **Yarl Samayal**. We respect your privacy and are committed to protecting the personal information you share with us when ordering our authentic Jaffna spices and regional snacks.

---

### 1. Information We Collect
When you browse our storefront or place an order, we may collect the following details:
- **Contact Details**: Name, email address, and phone number.
- **Delivery Address**: Street address, city, district, postal code, and country for shipping fulfillment.
- **Order & Preferences**: Products purchased, preferred currency, and transaction details.

### 2. How We Use Your Information
We use your personal data exclusively for essential operations:
- Processing, packaging, and delivering your orders.
- Communicating order updates, tracking information, or customer support responses.
- Maintaining store functionality, security, and fraud prevention.

### 3. Data Protection & Sharing
- We **do not sell or rent** your personal information to third parties.
- We share delivery information with trusted shipping couriers solely to fulfill your package delivery.
- We implement industry-standard encryption and secure database controls to safeguard your data.

### 4. Your Rights & Questions
You have the right to request access to, correction of, or deletion of your personal details stored on our system. 

If you have any questions regarding this Privacy Policy, please contact our support team at **support@yarlsamayal.com**.`,
    is_published: true,
  },
  {
    slug: 'terms-of-service',
    title: 'Terms of Service',
    content: `<!-- Note for Siva: Please review and edit before relying on this text legally. -->

# Terms of Service

By placing an order or accessing **Yarl Samayal**, you agree to be bound by the terms outlined below.

---

### 1. Product Ordering & Pricing
- All prices displayed on our storefront are subject to applicable taxes and shipping fees calculated at checkout.
- While we strive to ensure accurate pricing and stock levels, in rare cases of technical errors, Yarl Samayal reserves the right to cancel or adjust orders with full customer notification.

### 2. Payment Terms & Cash on Delivery (COD)
- We accept Cash on Delivery (COD) and supported electronic payment options.
- For COD orders, exact payment must be tendered upon physical package delivery by our partner courier.
- Refusal to accept verified COD deliveries without valid justification may result in restriction from future order placements.

### 3. Shipping & Customer Responsibility
- Customers are responsible for providing complete, accurate delivery address details and contact numbers.
- Any re-consignment fees or non-delivery costs resulting from incorrect customer-provided addresses will be the responsibility of the customer.

### 4. Product Quality & Sourcing
- Our products are sourced directly from Jaffna producers and prepared under strict quality standards.
- Due to the nature of authentic regional spices and handcrafted snacks, minor visual variations may occur.

### 5. Contact & Dispute Resolution
For inquiries regarding these Terms, please reach out to **support@yarlsamayal.com**.`,
    is_published: true,
  },
  {
    slug: 'shipping-returns',
    title: 'Shipping & Returns',
    content: `<!-- Note for Siva: Please review and edit before relying on this text legally. -->

# Shipping & Returns Policy

At **Yarl Samayal**, we take immense pride in carefully packaging and shipping authentic Jaffna spices and traditional delicacies directly to your doorstep.

---

### 1. Delivery Regions & Timeframes
- **Domestic Shipping (Sri Lanka)**: Standard delivery takes **2 - 4 business days** depending on district.
- **International Shipping**: International deliveries typically arrive within **7 - 14 business days** via reliable courier partners.
- Orders are processed within 24 hours of placement (excluding Sundays and public holidays).

### 2. Shipping Rates
- Shipping rates are calculated based on weight and destination country during checkout.
- Clear shipping weight thresholds are applied automatically at checkout.

### 3. Returns & Replacements
- Because our offerings include edible spice blends and food snacks, we cannot accept returns on opened packages for health and safety reasons.
- **Damaged or Incorrect Items**: If your order arrives damaged or if you receive an incorrect item, please notify us within **48 hours of delivery** with photographic proof. We will promptly issue a replacement or refund.

### 4. How to Report an Issue
To submit a replacement or shipping query, please email **support@yarlsamayal.com** with your order number and package details.`,
    is_published: true,
  },
]

async function seedLegalPages() {
  console.log('Seeding legal pages via Supabase client...')
  const { data, error } = await supabase
    .from('legal_pages')
    .upsert(seedData, { onConflict: 'slug' })
    .select('*')

  if (error) {
    console.error('Error seeding legal_pages:', error.message)
  } else {
    console.log('✅ Successfully seeded legal pages:', data.map(d => d.slug))
  }
}

seedLegalPages().catch(console.error)
