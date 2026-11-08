import test from 'node:test';
import assert from 'node:assert/strict';

function filterVouchersByState(vouchers, filter) {
  if (!vouchers || !Array.isArray(vouchers)) return [];
  if (filter === 'active') return vouchers.filter(v => v.state === 'issued');
  if (filter === 'redeemed') return vouchers.filter(v => v.state === 'redeemed' || v.state === 'expired');
  return vouchers;
}

function calculateOfferEligibility(offer, earnedStamps, userVouchers) {
  const req = offer.required_stamps || 1;
  const count = typeof earnedStamps === 'number' ? earnedStamps : 0;
  const alreadyClaimed = Array.isArray(userVouchers) && userVouchers.some(v => v.offer_id === offer.id);
  return {
    eligible: count >= req && !alreadyClaimed,
    progress: Math.min(100, Math.round((count / req) * 100)),
    remaining: Math.max(0, req - count),
    alreadyClaimed
  };
}

test('filterVouchersByState filters active vs redeemed vs all', () => {
  const vouchers = [
    { id: '1', code: 'MASAR-GAHWA-001', state: 'issued' },
    { id: '2', code: 'MASAR-SKY-002', state: 'redeemed' },
    { id: '3', code: 'MASAR-ABRA-003', state: 'issued' },
    { id: '4', code: 'DEMO-POST-004', state: 'expired' },
  ];

  assert.equal(filterVouchersByState(vouchers, 'all').length, 4);
  assert.equal(filterVouchersByState(vouchers, 'active').length, 2);
  assert.equal(filterVouchersByState(vouchers, 'redeemed').length, 2);
  assert.deepEqual(filterVouchersByState([], 'active'), []);
  assert.deepEqual(filterVouchersByState(null, 'all'), []);
});

test('calculateOfferEligibility correctly measures thresholds and claim state', () => {
  const offer = { id: 'burj-sky-treat-v1', required_stamps: 2 };

  // 1 stamp earned, not yet claimed -> not eligible
  const status1 = calculateOfferEligibility(offer, 1, []);
  assert.equal(status1.eligible, false);
  assert.equal(status1.remaining, 1);
  assert.equal(status1.progress, 50);
  assert.equal(status1.alreadyClaimed, false);

  // 2 stamps earned, not yet claimed -> eligible
  const status2 = calculateOfferEligibility(offer, 2, []);
  assert.equal(status2.eligible, true);
  assert.equal(status2.remaining, 0);
  assert.equal(status2.progress, 100);

  // 3 stamps earned, already claimed -> ineligible because one claim per user
  const status3 = calculateOfferEligibility(offer, 3, [{ offer_id: 'burj-sky-treat-v1' }]);
  assert.equal(status3.eligible, false);
  assert.equal(status3.alreadyClaimed, true);
});
