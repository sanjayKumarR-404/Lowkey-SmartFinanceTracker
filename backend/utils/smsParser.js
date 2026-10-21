// utils/smsParser.js — Parses bank SMS messages to extract transaction details
// This utility uses regular expressions and keyword lists to extract financial data.
// We avoid machine learning or external libraries so that the logic remains simple,
// predictable, and easy to explain in a college viva.

/**
 * Month name lookup table for converting 3-letter month abbreviations to 0-indexed month numbers
 */
const MONTH_MAP = {
  jan: 0, feb: 1, mar: 2, apr: 3, may: 4, jun: 5,
  jul: 6, aug: 7, sep: 8, oct: 9, nov: 10, dec: 11,
};

/**
 * Checks whether the text is a non-transaction message like an OTP,
 * promotional offer, or bill payment reminder without an actual debit.
 * Returns true if the message should be rejected (returns null).
 */
function isIgnoredMessage(text) {
  // 1. OTP or authorization messages
  // These often mention amounts (e.g. "OTP for transaction of Rs 500 at Amazon"),
  // but the transaction has not happened yet; it is only a code verification.
  const otpRegex = /\b(otp|one[- ]time password|verification code|secret code|security code)\b/i;
  if (otpRegex.test(text)) {
    return true;
  }

  // 2. Promotional messages and loan offers
  // e.g. "Pre-approved loan of Rs 5,00,000", "Apply now", "Get 20% discount"
  const promoRegex = /\b(pre[- ]approved|apply now|pre[- ]qualified|congratulations! you are eligible|avail personal loan|special offer)\b/i;
  if (promoRegex.test(text)) {
    return true;
  }

  // 3. Bill payment reminders or due date alerts (without actual debit/credit)
  // e.g. "Your bill of Rs 799 is due on 25-Oct. Pay now to avoid disconnection."
  const billDueRegex = /\b(bill reminder|payment due|due date|is due on|pay before)\b/i;
  const transactionVerbRegex = /\b(debited|spent|paid|withdrawn|credited|deposited|refund|received)\b/i;
  if (billDueRegex.test(text) && !transactionVerbRegex.test(text)) {
    return true;
  }

  return false;
}

/**
 * Determines whether the transaction is an "income" or "expense",
 * or returns null if no valid transaction action verb is found.
 */
function determineTransactionType(text) {
  // Words indicating an expense / debit
  const debitRegex = /\b(debited|spent|paid|withdrawn|purchase|sent|deducted)\b/i;

  // Words indicating income / credit
  const creditRegex = /\b(credited|received|deposited|refund|cashback)\b/i;

  const hasDebit = debitRegex.test(text);
  const hasCredit = creditRegex.test(text);

  // If neither verb is present, it's a balance inquiry or unhandled text (not a transaction)
  if (!hasDebit && !hasCredit) {
    return null;
  }

  // If "refund" or "cashback" is explicitly present, it is income
  if (/\b(refund|cashback)\b/i.test(text)) {
    return 'income';
  }

  // If only credit words appear
  if (hasCredit && !hasDebit) {
    return 'income';
  }

  // If only debit words appear
  if (hasDebit && !hasCredit) {
    return 'expense';
  }

  // If both appear (e.g. "debited ... refund will be processed" or "transfer from A to B credited"),
  // check which action keyword appears first or directly next to the amount
  const debitIndex = text.search(debitRegex);
  const creditIndex = text.search(creditRegex);

  return debitIndex < creditIndex ? 'expense' : 'income';
}

/**
 * Extracts the transaction amount from the SMS while ensuring we do NOT
 * accidentally pick up the "Avl Bal" (Available Balance) or "Total Bal".
 */
function extractAmount(text) {
  // Step 1: Locate any balance amounts in the SMS so we know what to ignore.
  // We search for patterns like "Avl Bal: Rs. 15,000" or "Available Balance INR 4,200".
  const balancePrefixRegex = /(?:avl\s*bal(?:ance)?|available\s*bal(?:ance)?|total\s*bal(?:ance)?|curr(?:ent)?\s*bal(?:ance)?|acct?\s*bal(?:ance)?|bal(?:ance)?|avl\s*limit|available\s*limit)\s*[:\-\s]*(?:Rs\.?|INR|₹)?\s*([0-9][0-9,]*(?:\.[0-9]{1,2})?)/gi;

  const balanceAmounts = new Set();
  let balMatch;
  while ((balMatch = balancePrefixRegex.exec(text)) !== null) {
    // Standardize to clean number string without commas
    const cleanNum = balMatch[1].replace(/,/g, '');
    balanceAmounts.add(cleanNum);
  }

  // Step 2: Try specific patterns where the amount is directly tied to a transaction keyword.
  // e.g. "debited by Rs 500", "spent INR 1,250", "paid ₹200", "credited with Rs. 5,000"
  const tiedAmountRegex = /(?:debited(?:\s+by|\s+for)?|spent|paid|withdrawn|sent|credited(?:\s+with|\s+by)?|deposited|received|purchase(?:\s+of)?|refund\s+of)\s*(?:Rs\.?|INR|₹)?\s*([0-9][0-9,]*(?:\.[0-9]{1,2})?)/i;
  const tiedMatch = text.match(tiedAmountRegex);
  if (tiedMatch) {
    const rawVal = tiedMatch[1].replace(/,/g, '');
    const num = parseFloat(rawVal);
    if (!isNaN(num) && num > 0) {
      return num;
    }
  }

  // Step 3: Try patterns where amount comes before the action verb.
  // e.g. "Rs. 1,250.00 debited", "INR 500 spent", "₹750 credited"
  const reverseTiedRegex = /(?:Rs\.?|INR|₹)\s*([0-9][0-9,]*(?:\.[0-9]{1,2})?)(?:\s*\/-)?\s*(?:debited|credited|spent|paid|withdrawn|deposited|received)/i;
  const revMatch = text.match(reverseTiedRegex);
  if (revMatch) {
    const rawVal = revMatch[1].replace(/,/g, '');
    const num = parseFloat(rawVal);
    if (!isNaN(num) && num > 0) {
      return num;
    }
  }

  // Step 4: Scan all currency amounts in the SMS and pick the first one that
  // is NOT marked as a balance amount.
  const generalCurrencyRegex = /(?:Rs\.?|INR|₹)\s*([0-9][0-9,]*(?:\.[0-9]{1,2})?)(?:\s*\/-)?/gi;
  let currMatch;
  while ((currMatch = generalCurrencyRegex.exec(text)) !== null) {
    const cleanNum = currMatch[1].replace(/,/g, '');
    // If this amount was flagged as an Avl Bal / Available Balance, skip it
    if (!balanceAmounts.has(cleanNum)) {
      const num = parseFloat(cleanNum);
      if (!isNaN(num) && num > 0) {
        return num;
      }
    }
  }

  return null;
}

/**
 * Extracts the last 4 digits of the bank account or card number.
 * e.g. "A/c **4321", "account ending 5678", "Card XX1234"
 */
function extractAccountLast4(text) {
  // Pattern 1: Explicit account/card phrases followed by masked or plain 4 digits
  const acctRegex = /(?:a\/c|acct?|account|card)(?:\s+no\.?|\s+ending(?:\s+in|\s+with)?|\s+is)?\s*[:\-\s]*(?:[xX*]+)?(\d{4})\b/i;
  const match = text.match(acctRegex);
  if (match) {
    return match[1];
  }

  // Pattern 2: Any 4 digits directly preceded by masking characters (e.g. "**4321" or "XX5678")
  const maskedRegex = /(?:[xX*]{2,})(\d{4})\b/;
  const maskedMatch = text.match(maskedRegex);
  if (maskedMatch) {
    return maskedMatch[1];
  }

  return null;
}

/**
 * Extracts transaction date and returns an ISO 8601 date string (UTC) or null.
 * Handles: "21-10-26", "21/10/2026", "21-Oct-26", "21Oct26", "21 Oct 2026".
 */
function extractDate(text) {
  // Pattern 1: "21-Oct-26", "21-Oct-2026", "21 Oct 2026", "21/Oct/2026"
  const wordMonthRegex = /\b(\d{1,2})[-\s/](Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)[a-z]*[-\s/](\d{2,4})\b/i;
  const wordMatch = text.match(wordMonthRegex);
  if (wordMatch) {
    const day = parseInt(wordMatch[1], 10);
    const monthKey = wordMonthRegex ? wordMatch[2].toLowerCase().slice(0, 3) : '';
    const monthIndex = MONTH_MAP[monthKey];
    let year = parseInt(wordMatch[3], 10);
    if (year < 100) year += 2000;

    const parsedDate = new Date(Date.UTC(year, monthIndex, day));
    if (!isNaN(parsedDate.getTime())) {
      return parsedDate.toISOString();
    }
  }

  // Pattern 2: "21Oct26" or "21Oct2026" (no separator between day, month and year)
  const compactRegex = /\b(\d{1,2})(Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)[a-z]*(\d{2,4})\b/i;
  const compactMatch = text.match(compactRegex);
  if (compactMatch) {
    const day = parseInt(compactMatch[1], 10);
    const monthKey = compactMatch[2].toLowerCase().slice(0, 3);
    const monthIndex = MONTH_MAP[monthKey];
    let year = parseInt(compactMatch[3], 10);
    if (year < 100) year += 2000;

    const parsedDate = new Date(Date.UTC(year, monthIndex, day));
    if (!isNaN(parsedDate.getTime())) {
      return parsedDate.toISOString();
    }
  }

  // Pattern 3: Numeric dates like "21-10-26", "21/10/2026" (DD-MM-YY or DD-MM-YYYY)
  const numDateRegex = /\b(\d{1,2})[-\/](\d{1,2})[-\/](\d{2,4})\b/;
  const numMatch = text.match(numDateRegex);
  if (numMatch) {
    const day = parseInt(numMatch[1], 10);
    const month = parseInt(numMatch[2], 10);
    let year = parseInt(numMatch[3], 10);
    if (year < 100) year += 2000;

    // Validate calendar ranges
    if (month >= 1 && month <= 12 && day >= 1 && day <= 31) {
      const parsedDate = new Date(Date.UTC(year, month - 1, day));
      if (!isNaN(parsedDate.getTime())) {
        return parsedDate.toISOString();
      }
    }
  }

  return null;
}

/**
 * Cleans extracted merchant strings: removes trailing punctuation,
 * unwanted prefixes, or leftover bank/channel keywords.
 */
function cleanMerchantName(raw) {
  if (!raw) return null;

  let cleaned = raw
    // Replace underscores or slashes with spaces
    .replace(/[_/]/g, ' ')
    // Remove common VPA domain suffixes like @okaxis, @icici, @upi, etc.
    .replace(/@[a-zA-Z0-9.\-_]+/g, '')
    // Remove leading/trailing non-alphanumeric characters (keep inner apostrophes)
    .replace(/^[^a-zA-Z0-9]+|[^a-zA-Z0-9]+$/g, '')
    // Collapse multiple spaces
    .replace(/\s+/g, ' ')
    .trim();

  // If the extracted text refers to the user's bank or card account, it is not a merchant
  if (/\b(bank|account|a\/c|acct|debit card|credit card)\b/i.test(cleaned)) {
    return null;
  }

  // If the extracted text is empty or purely numeric or generic stop words, ignore it
  const stopWords = ['a c', 'ac', 'account', 'atm', 'bank', 'card', 'upi', 'vpa', 'ref', 'inr', 'rs', 'pos'];
  if (cleaned.length < 2 || stopWords.includes(cleaned.toLowerCase()) || /^\d+$/.test(cleaned)) {
    return null;
  }

  return cleaned;
}

/**
 * Extracts merchant, payee, or sender name from the SMS based on transaction type.
 * @param {string} text - Raw SMS text
 * @param {'income'|'expense'} type - Direction of money flow
 */
function extractMerchant(text, type) {
  // 1. UPI reference pattern: e.g. "UPI/123456/Swiggy" or "UPI/refno/merchant/..."
  const upiRefRegex = /\bUPI\/(?:[A-Za-z0-9]+\/)?([A-Za-z0-9&.'\-_ ]+?)(?:\/|\s|$)/i;
  const upiMatch = text.match(upiRefRegex);
  if (upiMatch && upiMatch[1]) {
    const cleaned = cleanMerchantName(upiMatch[1]);
    if (cleaned) return cleaned;
  }

  // 2. Info: prefix pattern used commonly by ICICI / HDFC
  // e.g. "Info: Netflix" or "Info: INF*SWIGGY*123"
  const infoRegex = /\bInfo:\s*([A-Za-z0-9*.'\-_ ]+?)(?=\s+(?:on|ref|avl|bal|total|\.|$))/i;
  const infoMatch = text.match(infoRegex);
  if (infoMatch) {
    const cleaned = cleanMerchantName(infoMatch[1]);
    if (cleaned) return cleaned;
  }

  // 3. VPA pattern: e.g. "to VPA airtel@icici" or "VPA zomato@hdfc"
  const vpaRegex = /\b(?:to\s+)?VPA\s+([A-Za-z0-9.'\-_@]+)/i;
  const vpaMatch = text.match(vpaRegex);
  if (vpaMatch) {
    const cleaned = cleanMerchantName(vpaMatch[1]);
    if (cleaned) return cleaned;
  }

  // 4. For INCOME transactions: Look for sender / source
  // e.g. "received from Rahul", "transfer from Ramesh Kumar", "from Mom", "from Zomato"
  if (type === 'income') {
    const creditFromRegex = /\b(?:received from|transfer from|by transfer from|from)\s+([A-Za-z0-9&.'\-_ ]+?)(?=\s+(?:on|ref|via|using|to|for|in|avl|bal|total|a\/c|card|\.|$))/i;
    const creditMatch = text.match(creditFromRegex);
    if (creditMatch) {
      const candidate = creditMatch[1].trim();
      if (!/^(?:a\/c|acct?|account|your\s+a\/c|my\s+a\/c|transfer)/i.test(candidate)) {
        const cleaned = cleanMerchantName(candidate);
        if (cleaned) return cleaned;
      }
    }

    // Direct "by Salary" pattern (common in salary credits)
    const byRegex = /\bby\s+([A-Za-z0-9&.'\-_ ]+?)(?=\s+(?:on|ref|via|using|to|avl|bal|total|a\/c|card|\.|$))/i;
    const byMatch = text.match(byRegex);
    if (byMatch) {
      const candidate = byMatch[1].trim();
      if (!/^(?:transfer|cheque|cash|a\/c|account|card)/i.test(candidate)) {
        const cleaned = cleanMerchantName(candidate);
        if (cleaned) return cleaned;
      }
    }
  }

  // 5. For EXPENSE transactions: Look for merchant / payee
  // e.g. "at STARBUCKS", "towards Uber", "paid to Apollo Pharmacy", "sent to Priya Patel", "at Decathlon"
  if (type === 'expense') {
    const prepRegex = /\b(?:at|towards|paid to|transfer to|sent to|to)\s+([A-Za-z0-9&.'\-_ ]+?)(?=\s+(?:on|ref|via|using|from|for|in|avl|bal|total|a\/c|card|\.|$))/i;
    const prepMatch = text.match(prepRegex);
    if (prepMatch) {
      const candidate = prepMatch[1].trim();
      // Exclude cases where "to" matched account or bank phrases
      if (!/^(?:a\/c|acct?|account|your|my|the\s+a\/c)/i.test(candidate)) {
        const cleaned = cleanMerchantName(candidate);
        if (cleaned) return cleaned;
      }
    }
  }

  return null;
}

/**
 * Main parser function:
 * Converts raw SMS text into a structured transaction object, or returns null.
 *
 * @param {string} text - The raw bank SMS text
 * @returns {object|null} - { type, amount, merchant, date, accountLast4 } or null
 */
function parseSms(text) {
  // Ensure input is a non-empty string
  if (!text || typeof text !== 'string') {
    return null;
  }

  const cleanText = text.trim();
  if (cleanText.length === 0) {
    return null;
  }

  // Step 1: Reject OTPs, promo offers, and non-transaction messages
  if (isIgnoredMessage(cleanText)) {
    return null;
  }

  // Step 2: Determine transaction type ("income" or "expense")
  // If no debit or credit action verb is found, return null (e.g. balance check only)
  const type = determineTransactionType(cleanText);
  if (!type) {
    return null;
  }

  // Step 3: Extract the transaction amount (ignoring any "available balance" amounts)
  const amount = extractAmount(cleanText);
  if (amount === null || amount <= 0) {
    return null;
  }

  // Step 4: Extract account/card last 4 digits (optional, returns null if missing)
  const accountLast4 = extractAccountLast4(cleanText);

  // Step 5: Extract date (optional, returns null if missing)
  const date = extractDate(cleanText);

  // Step 6: Extract merchant/counterparty (optional, returns null if unclear)
  const merchant = extractMerchant(cleanText, type);

  return {
    type,
    amount,
    merchant,
    date,
    accountLast4,
  };
}

module.exports = { parseSms };
