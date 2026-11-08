import test from 'node:test';
import assert from 'node:assert/strict';
import { MAX_FILE_BYTES, MAX_BATCH_BYTES, validateReceiptSelection } from './receiptFiles.mjs';

const file = (name, size = 100, type = 'image/jpeg') => ({ name, size, type });

test('one invalid file does not discard valid files in the batch', () => {
  const photo = file('receipt.jpg');
  const pdf = file('receipt.pdf', 200, 'application/pdf');
  const result = validateReceiptSelection([photo, file('script.svg', 100, 'image/svg+xml'), pdf]);
  assert.deepEqual(result.accepted, [photo, pdf]);
  assert.equal(result.errors.length, 1);
});

test('rejects empty and oversized files but accepts the exact limit', () => {
  const boundary = file('boundary.jpg', MAX_FILE_BYTES);
  const result = validateReceiptSelection([file('empty.jpg', 0), file('large.jpg', MAX_FILE_BYTES + 1), boundary]);
  assert.deepEqual(result.accepted, [boundary]);
  assert.equal(result.errors.length, 2);
});

test('existing pages count toward the total file limit', () => {
  const existing = Array.from({ length: 19 }, (_, index) => file(`${index}.jpg`));
  const result = validateReceiptSelection([file('last.jpg'), file('overflow.jpg')], existing);
  assert.equal(result.accepted.length, 1);
  assert.match(result.errors[0], /20 files/);
});

test('existing pages count toward the aggregate byte limit', () => {
  const result = validateReceiptSelection([file('fit.jpg', 50), file('overflow.jpg', 51)], [file('existing', MAX_BATCH_BYTES - 100)]);
  assert.equal(result.accepted.length, 1);
  assert.match(result.errors[0], /50 MB/);
});

test('an oversized file does not consume a slot or bytes for a later valid file', () => {
  const result = validateReceiptSelection([file('too-large.jpg', MAX_BATCH_BYTES), file('good.jpg')]);
  assert.equal(result.accepted[0].name, 'good.jpg');
});
