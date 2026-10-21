// tests/categoryTests.js — Tests the categorizer utility with 45 fake merchant examples
// Run with: npm run test:category
// Prints PASS/FAIL for each example and a final accuracy percentage.

// Load the categorizer (path is relative to /backend directory)
const { categorize } = require('../utils/categorizer');

// Each test: { merchant, note, type, expected }
// Merchant names are intentionally mixed-case and sometimes have extra words,
// mimicking real bank SMS parser output.
const tests = [
  // Food & dining
  { merchant: 'SWIGGY*ORDER 123',       note: '',                    type: 'expense', expected: 'Food & dining' },
  { merchant: 'Zomato Online',          note: '',                    type: 'expense', expected: 'Food & dining' },
  { merchant: 'Starbucks Reserve',      note: '',                    type: 'expense', expected: 'Food & dining' },
  { merchant: 'KFC India',              note: '',                    type: 'expense', expected: 'Food & dining' },
  { merchant: "McDonald's",             note: '',                    type: 'expense', expected: 'Food & dining' },
  { merchant: 'FASSOS',                 note: '',                    type: 'expense', expected: 'Food & dining' },
  { merchant: 'Haldirams Outlet',       note: '',                    type: 'expense', expected: 'Food & dining' },
  { merchant: 'DOMINO\'S PIZZA',        note: '',                    type: 'expense', expected: 'Food & dining' },
  { merchant: 'Chaayos Cafe',           note: '',                    type: 'expense', expected: 'Food & dining' },
  { merchant: '',                       note: 'lunch at restaurant', type: 'expense', expected: 'Food & dining' },

  // Groceries
  { merchant: 'BigBasket Order',        note: '',                    type: 'expense', expected: 'Groceries' },
  { merchant: 'BLINKIT',                note: '',                    type: 'expense', expected: 'Groceries' },
  { merchant: 'Zepto Quick Commerce',   note: '',                    type: 'expense', expected: 'Groceries' },
  { merchant: 'DMART LIMITED',          note: '',                    type: 'expense', expected: 'Groceries' },
  { merchant: 'Reliance Smart',         note: '',                    type: 'expense', expected: 'Groceries' },
  { merchant: '',                       note: 'grocery from kirana', type: 'expense', expected: 'Groceries' },

  // Transport
  { merchant: 'UBER*TRIP',              note: '',                    type: 'expense', expected: 'Transport' },
  { merchant: 'Ola Cabs',               note: '',                    type: 'expense', expected: 'Transport' },
  { merchant: 'RAPIDO BIKE',            note: '',                    type: 'expense', expected: 'Transport' },
  { merchant: 'Indian Oil Petrol',      note: '',                    type: 'expense', expected: 'Transport' },
  { merchant: 'BMTC Bus Pass',          note: '',                    type: 'expense', expected: 'Transport' },
  { merchant: '',                       note: 'petrol fill-up',      type: 'expense', expected: 'Transport' },

  // Shopping
  { merchant: 'Amazon.in',              note: '',                    type: 'expense', expected: 'Shopping' },
  { merchant: 'FLIPKART INTERNET',      note: '',                    type: 'expense', expected: 'Shopping' },
  { merchant: 'Myntra Fashion',         note: '',                    type: 'expense', expected: 'Shopping' },
  { merchant: 'AJIO ONLINE',            note: '',                    type: 'expense', expected: 'Shopping' },
  { merchant: 'Decathlon India',        note: '',                    type: 'expense', expected: 'Shopping' },

  // Bills & utilities
  { merchant: 'BESCOM Electricity',     note: '',                    type: 'expense', expected: 'Bills & utilities' },
  { merchant: 'Airtel Broadband',       note: '',                    type: 'expense', expected: 'Bills & utilities' },
  { merchant: 'Jio Recharge',           note: '',                    type: 'expense', expected: 'Bills & utilities' },
  { merchant: 'BWSSB Water Bill',       note: '',                    type: 'expense', expected: 'Bills & utilities' },
  { merchant: '',                       note: 'electricity bill',    type: 'expense', expected: 'Bills & utilities' },

  // Subscriptions
  { merchant: 'NETFLIX.COM',            note: '',                    type: 'expense', expected: 'Subscriptions' },
  { merchant: 'Spotify Premium',        note: '',                    type: 'expense', expected: 'Subscriptions' },
  { merchant: 'AMAZON PRIME VIDEO',     note: '',                    type: 'expense', expected: 'Subscriptions' },
  { merchant: 'YouTube Premium',        note: '',                    type: 'expense', expected: 'Subscriptions' },

  // Health
  { merchant: 'Apollo Pharmacy',        note: '',                    type: 'expense', expected: 'Health' },
  { merchant: 'MEDPLUS HEALTH',         note: '',                    type: 'expense', expected: 'Health' },
  { merchant: '1mg Online',             note: '',                    type: 'expense', expected: 'Health' },
  { merchant: 'Fortis Hospital',        note: '',                    type: 'expense', expected: 'Health' },

  // Salary (income)
  { merchant: 'Employer',               note: 'salary credit',       type: 'income',  expected: 'Salary' },
  { merchant: 'NEFT Salary',            note: '',                    type: 'income',  expected: 'Salary' },

  // Travel
  { merchant: 'MakeMyTrip',             note: '',                    type: 'expense', expected: 'Travel' },
  { merchant: 'IRCTC Online',           note: '',                    type: 'expense', expected: 'Travel' },

  // Other (should not match anything)
  { merchant: 'Unknown Shop',           note: '',                    type: 'expense', expected: 'Other' },
];

// ── Run tests ────────────────────────────────────────────────────────────
let passed = 0;
let failed = 0;
const failedExamples = [];

tests.forEach((test, i) => {
  const result = categorize({ merchant: test.merchant, note: test.note, type: test.type });
  const ok = result === test.expected;

  if (ok) {
    passed++;
    console.log(`PASS [${String(i + 1).padStart(2)}] "${test.merchant || test.note}" → ${result}`);
  } else {
    failed++;
    failedExamples.push({ i: i + 1, merchant: test.merchant, note: test.note, expected: test.expected, got: result });
    console.log(`FAIL [${String(i + 1).padStart(2)}] "${test.merchant || test.note}" → got "${result}", expected "${test.expected}"`);
  }
});

const total = tests.length;
const accuracy = ((passed / total) * 100).toFixed(1);

console.log(`\n──────────────────────────────`);
console.log(`Results: ${passed}/${total} passed — Accuracy: ${accuracy}%`);
if (failedExamples.length > 0) {
  console.log(`\nFailed examples:`);
  failedExamples.forEach((f) => {
    console.log(`  #${f.i}: merchant="${f.merchant}" note="${f.note}" → expected "${f.expected}", got "${f.got}"`);
  });
}
