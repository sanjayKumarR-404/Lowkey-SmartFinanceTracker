// utils/categorizer.js — Keyword-based auto-categorizer for transactions
// Returns one of the category names from frontend/src/constants/categories.js.
// Match is done case-insensitively on merchant name first, then the note field.
// No machine learning — just plain keyword lists, easy to read and explain.

// Each key in RULES is an exact category name (matching categories.js).
// Each array is a list of keywords to look for in the merchant or note text.
const RULES = {
  // Food & dining: restaurants, food delivery, cafes, fast food chains
  'Food & dining': [
    'swiggy', 'zomato', 'restaurant', 'cafe', 'starbucks', 'dominos', "domino's",
    'kfc', 'mcdonald', "mcdonald's", 'mcdonalds', 'burger king', 'pizza hut',
    'subway', 'dunkin', 'biryani', 'dhaba', 'udupi', 'haldirams', 'fassos',
    'behrouz', 'rebel foods', 'box8', 'eatfit', 'freshmenu', 'eatsure',
    'barbeque nation', 'paradise', 'hotel restaurant', 'food court', 'canteen',
    'taco bell', 'chaayos', 'tea', 'coffee', 'bakery', 'sweet shop',
  ],

  // Groceries: supermarkets, online grocery delivery
  Groceries: [
    'bigbasket', 'big basket', 'blinkit', 'zepto', 'dmart', 'd-mart',
    'grofers', 'jiomart', 'supermarket', 'reliance smart', 'more supermarket',
    'star bazaar', 'spencers', "nature's basket", 'hypercity', 'metro cash',
    'wholesale', 'kirana', 'milk', 'vegetables', 'fruits',
  ],

  // Transport: ride-hailing, fuel, metro, auto, public transport
  Transport: [
    'uber', 'ola', 'rapido', 'metro', 'dmrc', 'bmtc', 'ksrtc', 'apsrtc',
    'tsrtc', 'bus', 'auto', 'indrive', 'meru', 'petrol', 'fuel', 'indian oil',
    'iocl', 'hp petrol', 'bharat petroleum', 'bpcl', 'hpcl', 'shell',
    'cab', 'taxi', 'namma yatri', 'yulu', 'vogo', 'bounce', 'parking',
    'fastag', 'toll', 'rickshaw',
  ],

  // Subscriptions: recurring digital services — checked BEFORE Shopping so
  // "AMAZON PRIME VIDEO" matches here, not in the Shopping "amazon" keyword.
  Subscriptions: [
    'netflix', 'spotify', 'prime video', 'amazon prime', 'youtube premium',
    'icloud', 'google one', 'microsoft 365', 'office 365', 'dropbox',
    'notion', 'slack', 'zoom', 'github', 'adobe', 'canva pro', 'figma',
    'grammarly', 'lastpass', 'nordvpn', 'subscription', 'annual plan',
  ],

  // Shopping: e-commerce, clothing, electronics, retail
  Shopping: [
    'amazon', 'flipkart', 'myntra', 'ajio', 'meesho', 'nykaa', 'bewakoof',
    'westside', 'lifestyle', 'pantaloons', 'shoppers stop', 'zara', 'h&m',
    'uniqlo', 'max fashion', 'decathlon', 'croma', 'reliance digital',
    'vijay sales', 'poorvika', 'electronics', 'mobile store', 'apple store',
    'samsung', 'shopify', 'snapdeal', 'indiamart', 'jiostore',
  ],

  // Bills & utilities: electricity, gas, water, internet, phone recharge
  'Bills & utilities': [
    'electricity', 'bescom', 'tsspdcl', 'apspdcl', 'msedcl', 'tneb',
    'airtel', 'jio', 'vodafone', 'vi mobile', 'bsnl', 'idea',
    'broadband', 'internet bill', 'wifi', 'act fibernet', 'hathway',
    'piped gas', 'indane gas', 'mahanagar gas', 'water bill', 'bwssb',
    'bbmp', 'municipal', 'dth', 'tata sky', 'dish tv', 'sun direct',
    'recharge', 'utility', 'phone bill',
  ],

  // Rent: house rent payments
  Rent: [
    'rent', 'landlord', 'house rent', 'flat rent', 'pg rent',
    'accommodation', 'hostel fee', 'room rent',
  ],

  // Entertainment: movies, events, streaming video (not music subscriptions)
  Entertainment: [
    'bookmyshow', 'pvr', 'inox', 'cinepolis', 'movie', 'cinema',
    'hotstar', 'disney', 'zee5', 'sonyliv', 'voot', 'alt balaji',
    'jiocinema', 'mxplayer', 'hungama', 'concert', 'event ticket',
    'livelyhood', 'insider', 'paytm insider', 'ticketnew', 'carnival',
  ],

  // Health: pharmacies, hospitals, clinics, health apps
  Health: [
    'pharmacy', 'apollo pharmacy', 'medplus', 'netmeds', '1mg',
    'pharmeasy', 'hospital', 'clinic', 'medical', 'doctor', 'dentist',
    'lab test', 'health checkup', 'thyrocare', 'dr lal', 'manipal hospital',
    'fortis', 'columbia asia', 'apollo hospital', 'narayana', 'cure.fit',
    'healthians', 'tata health', 'practo',
  ],

  // Education: online courses, college, coaching, tuition
  Education: [
    'course', 'udemy', 'coursera', 'college', 'tuition', 'coaching',
    'byju', "byjus", 'vedantu', 'unacademy', 'toppr', 'nptel', 'upgrad',
    'scaler', 'classplus', 'whitehat', 'simplilearn', 'internshala',
    'educational', 'school fee', 'exam fee', 'university',
  ],

  // Travel: flight, hotel, intercity travel booking
  Travel: [
    'makemytrip', 'mmt', 'goibibo', 'cleartrip', 'yatra', 'ixigo',
    'airlines', 'indigo', 'air india', 'vistara', 'spicejet', 'akasa',
    'hotel', 'oyo', 'airbnb', 'stayvista', 'treebo', 'fabhotels',
    'irctc', 'redbus', 'abhibus', 'travel', 'trip',
  ],

  // Salary: income credits — matched only when type === 'income'
  Salary: [
    'salary', 'payroll', 'stipend', 'wages', 'monthly pay', 'ctc',
    'neft salary', 'sal credit', 'employer',
  ],

  // Transfers: money moved between own accounts or to/from people
  Transfers: [
    'transfer', 'neft', 'imps', 'rtgs', 'upi to self', 'own account',
    'paytm wallet', 'phonepe wallet', 'gpay', 'google pay', 'self transfer',
  ],
};

const ALLOWED_CATEGORIES = [
  'Food & dining',
  'Groceries',
  'Transport',
  'Shopping',
  'Bills & utilities',
  'Rent',
  'Entertainment',
  'Health',
  'Education',
  'Travel',
  'Subscriptions',
  'Salary',
  'Transfers',
  'Other',
];

/**
 * Categorize a transaction based on merchant name and/or note.
 *
 * @param {object} params
 * @param {string} [params.merchant] - Merchant or payee name
 * @param {string} [params.note]     - Free-text note
 * @param {string} [params.type]     - 'income' or 'expense'
 * @returns {string} - Category name (matches categories.js exactly)
 */
function categorize({ merchant = '', note = '', type = 'expense' }) {
  // Combine merchant and note into a single lowercase string to search in
  // We check merchant first by putting it before note; later we check position
  const combined = `${merchant} ${note}`.toLowerCase().trim();

  if (!combined) {
    return 'Other';
  }

  // Salary is only meaningful for income transactions
  if (type === 'income') {
    const salaryKeywords = RULES['Salary'];
    if (salaryKeywords.some((kw) => combined.includes(kw))) {
      return 'Salary';
    }
  }

  // Try each category rule in order
  for (const [category, keywords] of Object.entries(RULES)) {
    // Skip salary for expenses — the Salary category is income-only
    if (category === 'Salary') continue;

    // Check if any keyword for this category appears in the combined text
    const matched = keywords.some((kw) => combined.includes(kw.toLowerCase()));
    if (matched) {
      return category;
    }
  }

  // No keyword matched — fall back to "Other"
  return 'Other';
}

module.exports = { categorize, ALLOWED_CATEGORIES };

