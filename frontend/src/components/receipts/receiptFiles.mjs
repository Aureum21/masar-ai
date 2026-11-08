export const MAX_FILE_BYTES = 10 * 1024 * 1024;
export const MAX_FILES = 20;
export const MAX_BATCH_BYTES = 50 * 1024 * 1024;
export const ACCEPTED_TYPES = ['image/jpeg', 'image/png', 'image/webp', 'application/pdf'];
export const FILE_ACCEPT = ACCEPTED_TYPES.join(',');

// Client-side preview checks only. Server-side decoding/limits remain mandatory.
export function validateReceiptSelection(incoming, existing = []) {
  const accepted = [];
  const errors = [];
  let total = existing.reduce((sum, file) => sum + file.size, 0);
  for (const file of incoming) {
    if (!ACCEPTED_TYPES.includes(file.type)) {
      errors.push(`${file.name}: use a JPG, PNG, WebP image or PDF.`);
    } else if (file.size === 0 || file.size > MAX_FILE_BYTES) {
      errors.push(`${file.name}: choose a non-empty file up to 10 MB.`);
    } else if (existing.length + accepted.length >= MAX_FILES) {
      errors.push(`${file.name}: select up to 20 files at a time.`);
    } else if (total + file.size > MAX_BATCH_BYTES) {
      errors.push(`${file.name}: the selection must be 50 MB or less.`);
    } else {
      accepted.push(file);
      total += file.size;
    }
  }
  return { accepted, errors };
}
