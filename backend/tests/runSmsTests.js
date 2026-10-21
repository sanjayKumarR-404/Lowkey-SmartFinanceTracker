// tests/runSmsTests.js — Test runner for the bank SMS parser
// Runs all test samples from smsSamples.json through parseSms() without external test frameworks.
// Calculates and displays accuracy for type, amount, and merchant.

const fs = require('fs');
const path = require('path');
const { parseSms } = require('../utils/smsParser');

// Load sample messages from JSON file
const samplesPath = path.join(__dirname, 'smsSamples.json');
const samples = JSON.parse(fs.readFileSync(samplesPath, 'utf8'));

console.log('='.repeat(70));
console.log('  RUNNING BANK SMS PARSER TESTS (' + samples.length + ' samples)');
console.log('='.repeat(70));

let typeMatches = 0;
let amountMatches = 0;
let merchantMatches = 0;
let totalPassed = 0;
const failedSamples = [];

samples.forEach((sample) => {
  const result = parseSms(sample.message);
  const { expected } = sample;

  let typeOk = false;
  let amountOk = false;
  let merchantOk = false;

  if (expected === null) {
    // If the sample should be rejected (e.g. OTP, promo, balance-only),
    // parseSms must return null.
    const correctlyRejected = result === null;
    typeOk = correctlyRejected;
    amountOk = correctlyRejected;
    merchantOk = correctlyRejected;
  } else if (result !== null) {
    // Check type match ("income" or "expense")
    typeOk = result.type === expected.type;

    // Check amount match (handle float precision)
    amountOk = Math.abs(result.amount - expected.amount) < 0.01;

    // Check merchant match
    if (expected.merchant === null) {
      merchantOk = result.merchant === null || result.merchant === undefined;
    } else if (result.merchant) {
      const actualM = result.merchant.toLowerCase();
      const expectedM = expected.merchant.toLowerCase();
      merchantOk = actualM === expectedM || actualM.includes(expectedM) || expectedM.includes(actualM);
    } else {
      merchantOk = false;
    }
  }

  if (typeOk) typeMatches++;
  if (amountOk) amountMatches++;
  if (merchantOk) merchantMatches++;

  const isSamplePass = typeOk && amountOk && merchantOk;

  if (isSamplePass) {
    totalPassed++;
    console.log(`[PASS] Sample #${sample.id} (${sample.bank})`);
  } else {
    failedSamples.push({ sample, result, typeOk, amountOk, merchantOk });
    console.log(`[FAIL] Sample #${sample.id} (${sample.bank})`);
    console.log(`       Message: "${sample.message}"`);
    console.log(`       Expected:`, expected);
    console.log(`       Actual:  `, result);
  }
});

const total = samples.length;
const typeAcc = ((typeMatches / total) * 100).toFixed(2);
const amountAcc = ((amountMatches / total) * 100).toFixed(2);
const merchantAcc = ((merchantMatches / total) * 100).toFixed(2);
const overallAcc = ((totalPassed / total) * 100).toFixed(2);

console.log('\n' + '='.repeat(70));
console.log('  TEST RESULTS SUMMARY');
console.log('='.repeat(70));
console.log(`Total Samples Tested:   ${total}`);
console.log(`Overall Passed:         ${totalPassed}/${total} (${overallAcc}%)`);
console.log(`Type Accuracy:          ${typeMatches}/${total} (${typeAcc}%)`);
console.log(`Amount Accuracy:        ${amountMatches}/${total} (${amountAcc}%)`);
console.log(`Merchant Accuracy:      ${merchantMatches}/${total} (${merchantAcc}%)`);
console.log('='.repeat(70) + '\n');

if (failedSamples.length > 0) {
  console.log(`\nFailed Samples Count: ${failedSamples.length}`);
}
