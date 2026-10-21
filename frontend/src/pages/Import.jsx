// pages/Import.jsx — Bank statement CSV and SMS parser import view
import React, { useRef, useState } from 'react';
import { AlertCircle, CheckCircle2, FileInput, Upload } from 'lucide-react';
import { createTransaction } from '../services/transactionService';
import { useToast } from '../context/ToastContext';
import { formatCurrency, formatDate } from '../utils/formatters';
import './Import.css';

function parseCsv(text) {
  const rows = [];
  let row = [];
  let cell = '';
  let quoted = false;

  for (let i = 0; i < text.length; i++) {
    const character = text[i];
    if (character === '"') {
      if (quoted && text[i + 1] === '"') {
        cell += '"';
        i++;
      } else {
        quoted = !quoted;
      }
    } else if (character === ',' && !quoted) {
      row.push(cell);
      cell = '';
    } else if ((character === '\n' || character === '\r') && !quoted) {
      if (character === '\r' && text[i + 1] === '\n') i++;
      row.push(cell);
      if (row.some((value) => value.trim())) rows.push(row);
      row = [];
      cell = '';
    } else {
      cell += character;
    }
  }

  if (quoted) throw new Error('The CSV contains an unfinished quoted value.');
  row.push(cell);
  if (row.some((value) => value.trim())) rows.push(row);
  return rows;
}

function normalizeHeader(value) {
  return value.replace(/^\uFEFF/, '').toLowerCase().replace(/[^a-z0-9]/g, '');
}

function findColumn(headers, aliases) {
  return headers.findIndex((header) => aliases.includes(header));
}

function parseCsvDate(value) {
  const text = value.trim();
  const dayFirst = text.match(/^(\d{1,2})[-/](\d{1,2})[-/](\d{4})$/);
  if (dayFirst) {
    const [, dayText, monthText, yearText] = dayFirst;
    const day = Number(dayText);
    const month = Number(monthText);
    const year = Number(yearText);
    const date = new Date(year, month - 1, day);
    if (date.getFullYear() !== year || date.getMonth() !== month - 1 || date.getDate() !== day) return null;
    return new Date(Date.UTC(year, month - 1, day)).toISOString();
  }

  const date = new Date(text);
  return Number.isNaN(date.getTime()) ? null : date.toISOString();
}

function parseCsvAmount(value) {
  const text = value.trim();
  if (!text) return null;
  const isParenthesized = /^\(.*\)$/.test(text);
  const direction = text.match(/\s*(DR|CR)$/i)?.[1]?.toLowerCase();
  const numeric = Number(
    text.replace(/\s*(?:DR|CR)$/i, '').replace(/[₹,\s]/g, '').replace(/^Rs\.?|^INR/i, '').replace(/[()]/g, '')
  );
  if (!Number.isFinite(numeric)) return null;
  return isParenthesized || direction === 'dr' ? -Math.abs(numeric) : numeric;
}

function parseTransactions(text) {
  const rows = parseCsv(text);
  if (rows.length < 2) throw new Error('The CSV needs a header row and at least one transaction.');

  const headers = rows[0].map(normalizeHeader);
  const dateColumn = findColumn(headers, ['date', 'transactiondate', 'valuedate', 'valuedt']);
  const descriptionColumn = findColumn(headers, [
    'description', 'merchant', 'payee', 'particulars', 'narration', 'details', 'transactiondetails', 'name',
  ]);
  const amountColumn = findColumn(headers, ['amount', 'transactionamount', 'amountinr']);
  const debitColumn = findColumn(headers, ['debit', 'debitamt', 'debitamount', 'debitamountinr', 'withdrawal', 'withdrawalamt', 'withdrawalamount', 'withdrawalamountinr']);
  const creditColumn = findColumn(headers, ['credit', 'creditamt', 'creditamount', 'creditamountinr', 'deposit', 'depositamt', 'depositamount', 'depositamountinr']);
  const typeColumn = findColumn(headers, ['type', 'transactiontype', 'drcr']);
  const categoryColumn = findColumn(headers, ['category']);
  const noteColumn = findColumn(headers, ['note', 'remarks', 'reference']);

  if (dateColumn < 0 || (amountColumn < 0 && debitColumn < 0 && creditColumn < 0)) {
    throw new Error('Include a Date column and an Amount, Debit, or Credit column.');
  }

  return rows.slice(1).map((cells, index) => {
    const valueAt = (column) => (column < 0 ? '' : (cells[column] || '').trim());
    const date = parseCsvDate(valueAt(dateColumn));
    const debit = parseCsvAmount(valueAt(debitColumn));
    const credit = parseCsvAmount(valueAt(creditColumn));
    const rawAmount = parseCsvAmount(valueAt(amountColumn));
    const amountDirection = valueAt(amountColumn).match(/\s*(DR|CR)$/i)?.[1]?.toLowerCase();
    const hasDebit = debit !== null && debit !== 0;
    const hasCredit = credit !== null && credit !== 0;
    const selectedAmount = hasDebit ? Math.abs(debit) : hasCredit ? Math.abs(credit) : rawAmount === null ? null : Math.abs(rawAmount);
    const typeText = valueAt(typeColumn).toLowerCase();
    const type = hasDebit
      ? 'expense'
      : hasCredit
        ? 'income'
        : /income|credit|deposit|received|cr/.test(typeText) || amountDirection === 'cr'
          ? 'income'
          : 'expense';

    if (!date || selectedAmount === null || selectedAmount <= 0) {
      return { rowNumber: index + 2, error: 'Date and a positive amount are required.' };
    }

    const merchant = valueAt(descriptionColumn);
    return {
      rowNumber: index + 2,
      transaction: {
        date,
        type,
        amount: Math.abs(selectedAmount),
        merchant: merchant || undefined,
        category: valueAt(categoryColumn) || 'Other',
        note: valueAt(noteColumn) || undefined,
        source: 'csv',
      },
    };
  });
}

export default function Import() {
  const fileInput = useRef(null);
  const { showToast } = useToast();
  const [fileName, setFileName] = useState('');
  const [rows, setRows] = useState([]);
  const [error, setError] = useState('');
  const [importing, setImporting] = useState(false);
  const [result, setResult] = useState(null);

  const handleFile = async (event) => {
    const file = event.target.files?.[0];
    if (!file) return;
    setFileName(file.name);
    setRows([]);
    setError('');
    setResult(null);
    try {
      setRows(parseTransactions(await file.text()));
    } catch (parseError) {
      setError(parseError.message || 'Could not read this CSV file.');
    }
  };

  const handleImport = async () => {
    const validRows = rows.filter((row) => row.transaction);
    let imported = 0;
    let failed = 0;
    setImporting(true);
    setError('');

    for (const row of validRows) {
      try {
        await createTransaction(row.transaction);
        imported++;
      } catch {
        failed++;
      }
    }

    setResult({ imported, failed, skipped: rows.length - validRows.length });
    setImporting(false);
    if (imported > 0) showToast({ message: `Imported ${imported} transaction${imported === 1 ? '' : 's'}`, type: 'success' });
  };

  const validCount = rows.filter((row) => row.transaction).length;

  return (
    <div className="import-page">
      <header className="import-header">
        <div className="import-title-row"><FileInput size={21} /><h1>Import transactions</h1></div>
        <p>Choose a bank statement CSV, review the detected rows, then import them.</p>
      </header>

      <section className="import-upload" aria-labelledby="import-upload-title">
        <input ref={fileInput} type="file" accept=".csv,text/csv" onChange={handleFile} hidden />
        <div className="import-upload-icon"><Upload size={21} /></div>
        <div>
          <h2 id="import-upload-title">Select a CSV file</h2>
          <p>Date plus Amount, Debit, or Credit columns are required. Description, Type, Category, and Note are optional.</p>
          {fileName && <span className="import-file-name">{fileName}</span>}
        </div>
        <button type="button" className="import-select-button" onClick={() => fileInput.current?.click()}>
          Choose file
        </button>
      </section>

      {error && <div className="import-message error" role="alert"><AlertCircle size={17} />{error}</div>}

      {rows.length > 0 && (
        <section className="import-preview" aria-labelledby="import-preview-title">
          <div className="import-preview-header">
            <div>
              <h2 id="import-preview-title">Review transactions</h2>
              <p>{validCount} ready to import, {rows.length - validCount} skipped</p>
            </div>
            <button type="button" className="import-submit-button" disabled={!validCount || importing} onClick={handleImport}>
              {importing ? 'Importing…' : `Import ${validCount}`}
            </button>
          </div>
          <div className="import-table-wrap">
            <table className="import-table">
              <thead><tr><th>Row</th><th>Date</th><th>Description</th><th>Type</th><th>Amount</th><th>Status</th></tr></thead>
              <tbody>
                {rows.map((row) => (
                  <tr key={row.rowNumber}>
                    <td>{row.rowNumber}</td>
                    <td>{row.transaction ? formatDate(row.transaction.date) : '—'}</td>
                    <td>{row.transaction?.merchant || '—'}</td>
                    <td>{row.transaction?.type || '—'}</td>
                    <td>{row.transaction ? formatCurrency(row.transaction.amount) : '—'}</td>
                    <td>{row.transaction ? <span className="import-ready"><CheckCircle2 size={15} />Ready</span> : row.error}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      )}

      {result && (
        <div className={`import-message ${result.failed ? 'error' : 'success'}`} role="status">
          {result.failed ? <AlertCircle size={17} /> : <CheckCircle2 size={17} />}
          Imported {result.imported}; failed {result.failed}; skipped {result.skipped}.
        </div>
      )}
    </div>
  );
}
