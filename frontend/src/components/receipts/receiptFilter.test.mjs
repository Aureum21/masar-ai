import test from 'node:test';
import assert from 'node:assert/strict';
import { isReceiptScannedOrEdited } from './receiptFilter.mjs';

test('isReceiptScannedOrEdited returns true for ready receipt with extracted fields', () => {
  const receipt = {
    id: 'r1',
    state: 'ready',
    extracted_fields: { merchant_name: 'Apple Store' },
    merchant_name: 'Apple Store',
    total_amount: '3499.00',
    revision: 1
  };
  assert.equal(isReceiptScannedOrEdited(receipt), true);
});

test('isReceiptScannedOrEdited returns true for needs_review receipt with OCR extracted data', () => {
  const receipt = {
    id: 'r2',
    state: 'needs_review',
    extracted_fields: { total: '120.00' },
    merchant_name: 'Spice Souk',
    total_amount: '120.00',
    revision: 1
  };
  assert.equal(isReceiptScannedOrEdited(receipt), true);
});

test('isReceiptScannedOrEdited returns true when receipt has user corrections', () => {
  const receipt = {
    id: 'r3',
    state: 'ready',
    extracted_fields: {},
    corrections: [{ at: '2026-10-24T12:00:00Z', fields: { total_amount: '250.00' } }],
    revision: 2,
    total_amount: '250.00'
  };
  assert.equal(isReceiptScannedOrEdited(receipt), true);
});

test('isReceiptScannedOrEdited returns true when revision is greater than 1 (edited)', () => {
  const receipt = {
    id: 'r4',
    state: 'ready',
    extracted_fields: {},
    revision: 2,
    merchant_name: 'Bloomingdales'
  };
  assert.equal(isReceiptScannedOrEdited(receipt), true);
});

test('isReceiptScannedOrEdited returns false for pending queued receipt without edits', () => {
  const receipt = {
    id: 'r5',
    state: 'queued',
    extracted_fields: {},
    corrections: [],
    revision: 1,
    merchant_name: null,
    total_amount: null
  };
  assert.equal(isReceiptScannedOrEdited(receipt), false);
});

test('isReceiptScannedOrEdited returns false for uploading receipt without edits', () => {
  const receipt = {
    id: 'r6',
    state: 'uploading',
    extracted_fields: {},
    corrections: [],
    revision: 1
  };
  assert.equal(isReceiptScannedOrEdited(receipt), false);
});

test('isReceiptScannedOrEdited returns false for failed OCR receipt without edits', () => {
  const receipt = {
    id: 'r7',
    state: 'failed',
    extracted_fields: {},
    corrections: [],
    revision: 1,
    feedback: 'OCR timeout'
  };
  assert.equal(isReceiptScannedOrEdited(receipt), false);
});

test('isReceiptScannedOrEdited returns false for blank save-without-OCR stub', () => {
  const receipt = {
    id: 'r8',
    state: 'needs_review',
    extracted_fields: {},
    corrections: [],
    revision: 1,
    merchant_name: null,
    total_amount: null
  };
  assert.equal(isReceiptScannedOrEdited(receipt), false);
});

test('isReceiptScannedOrEdited handles null, undefined, or empty object gracefully', () => {
  assert.equal(isReceiptScannedOrEdited(null), false);
  assert.equal(isReceiptScannedOrEdited(undefined), false);
  assert.equal(isReceiptScannedOrEdited({}), false);
});

test('isReceiptScannedOrEdited returns true for receipt saved without OCR with uploaded file', () => {
  const receipt = {
    id: 'r9',
    state: 'needs_review',
    file_name: 'photo_2026-10-03_21-21-54-55.jpg',
    extracted_fields: {},
    corrections: [],
    revision: 1,
    merchant_name: null,
    total_amount: null
  };
  assert.equal(isReceiptScannedOrEdited(receipt), true);
});

test('isReceiptScannedOrEdited returns true for failed OCR receipt with uploaded photo', () => {
  const receipt = {
    id: 'r10',
    state: 'failed',
    file_name: 'receipt_blurry.jpg',
    extracted_fields: {},
    corrections: [],
    revision: 1
  };
  assert.equal(isReceiptScannedOrEdited(receipt), true);
});
