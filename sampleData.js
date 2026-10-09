// sampleData.js — demo content. All names, emails and phone numbers are fictional.

/** Eight realistic tickets for the "Load sample tickets" dropdown (English, Tamil, Tanglish). */
export const SAMPLE_TICKETS = [
  { label: 'Tanglish · Charged twice, wants refund', name: 'Priya S', contact: 'priya.s@example.com',
    text: 'Rendu thadava charge aaiduchu, refund venum!' },
  { label: 'Tanglish · Delivery late (5 days)', name: 'Arun Kumar', contact: '9876500001',
    text: 'Order 5 naal aachu innum delivery aagala' },
  { label: 'Tanglish · Is COD available?', name: 'Meena R', contact: 'meena.r@example.com',
    text: 'COD irukka?' },
  { label: 'Tanglish · Feature request', name: 'Vignesh', contact: '9876500002',
    text: 'Dark mode add pannunga' },
  { label: 'English · Damaged product', name: 'Divya M', contact: 'divya.m@example.com',
    text: 'I received a damaged phone case, the corner is cracked. Order #4821.' },
  { label: 'English · Hacked account + legal threat', name: 'Sanjay P', contact: '9876500003',
    text: 'Someone hacked my account and I will take legal action if this is not fixed today!' },
  { label: 'English · Forgot password', name: 'Lakshmi N', contact: 'lakshmi.n@example.com',
    text: 'How do I reset my password? I forgot it.' },
  { label: 'Tamil · Wrong item received', name: 'Nisha T', contact: '9876500004',
    text: 'எனக்கு தவறான பொருள் வந்துள்ளது, எப்படி மாற்றலாம்?' },
];

/**
 * Demo tickets pre-loaded on first open so the board, rewards and dashboard look alive.
 * ageHours: how old the ticket is when the demo is created.
 * approve: the owner has already approved the reward (needs status "confirmed").
 * Karthik R has four complaints on purpose, to show the manual-review flag.
 */
export const DEMO_SEEDS = [
  { name: 'Priya S', contact: 'priya.s@example.com', text: 'Rendu thadava charge aaiduchu, refund venum!', status: 'confirmed', ageHours: 70 },
  { name: 'Arun Kumar', contact: '9876500001', text: 'Order 5 naal aachu innum delivery aagala', status: 'in_progress', ageHours: 30 },
  { name: 'Meena R', contact: 'meena.r@example.com', text: 'COD irukka?', status: 'resolved', ageHours: 20 },
  { name: 'Vignesh', contact: '9876500002', text: 'Dark mode add pannunga', status: 'new', ageHours: 8 },
  { name: 'Divya M', contact: 'divya.m@example.com', text: 'I received a damaged phone case, the corner is cracked. Order #4821.', status: 'confirmed', ageHours: 96, approve: true },
  { name: 'Sanjay P', contact: '9876500003', text: 'Someone hacked my account and I will take legal action if this is not fixed today!', status: 'new', ageHours: 5 },
  { name: 'Lakshmi N', contact: 'lakshmi.n@example.com', text: 'How do I reset my password? I forgot it.', status: 'closed', ageHours: 150 },
  { name: 'Nisha T', contact: '9876500004', text: 'எனக்கு தவறான பொருள் வந்துள்ளது, எப்படி மாற்றலாம்?', status: 'assigned', ageHours: 12 },
  { name: 'Rahul V', contact: 'rahul.v@example.com', text: 'Payment failed but money deducted from my account', status: 'assigned', ageHours: 3 },
  { name: 'Fatima B', contact: '9876500005', text: 'Tracking shows shipped but parcel not received in 8 days', status: 'closed', ageHours: 200 },
  { name: 'Karthik R', contact: '9876500006', text: 'Order late, delivery delayed 6 days', status: 'closed', ageHours: 200 },
  { name: 'Karthik R', contact: '9876500006', text: 'Parcel arrived damaged', status: 'resolved', ageHours: 150 },
  { name: 'Karthik R', contact: '9876500006', text: 'Charged twice for my order', status: 'in_progress', ageHours: 60 },
  { name: 'Karthik R', contact: '9876500006', text: 'Wrong item delivered', status: 'confirmed', ageHours: 30 },
];
