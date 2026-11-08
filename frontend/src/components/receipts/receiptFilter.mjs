/**
 * Determines whether a receipt is validly scanned, saved, or user-edited.
 * Filters out unscanned stubs, raw pending upload jobs, and empty unverified records without files.
 *
 * @param {Object} receipt - The receipt object to check.
 * @returns {boolean} - True if scanned, saved with image/file, or user-edited.
 */
export function isReceiptScannedOrEdited(receipt) {
  if (!receipt || typeof receipt !== 'object') return false;

  // Deleted receipts must never be shown
  if (receipt.state === 'deleting' || receipt.state === 'deleted' || receipt.deleted_at) {
    return false;
  }

  // 1. Edited by user after initial scan/creation
  const hasUserEdits = Boolean(
    (Array.isArray(receipt.corrections) && receipt.corrections.length > 0) ||
    (typeof receipt.revision === 'number' && receipt.revision > 1)
  );

  // 2. Extracted fields from OCR scan
  const hasExtractedFields = Boolean(
    receipt.extracted_fields &&
    typeof receipt.extracted_fields === 'object' &&
    Object.keys(receipt.extracted_fields).length > 0
  );

  // 3. Recognized key data (merchant name or positive total)
  const hasConfirmedData = Boolean(
    (receipt.merchant_name && String(receipt.merchant_name).trim().length > 0) ||
    (receipt.total_amount != null && !isNaN(Number(receipt.total_amount)) && Number(receipt.total_amount) > 0)
  );

  // 4. Saved receipt with a private photo or file requiring attention or manual entry
  const hasSavedFile = Boolean(
    (receipt.file_name && String(receipt.file_name).trim().length > 0) ||
    Boolean(receipt.image_url)
  );

  // Pending background jobs without user edits or files must NOT be shown
  const isPending = ['uploading', 'queued', 'running'].includes(receipt.state);
  if (isPending) {
    return hasUserEdits;
  }

  // Failed state can be shown if it has a saved file or user edits
  if (receipt.state === 'failed') {
    return hasUserEdits || hasSavedFile;
  }

  // Scanned receipt from OCR with extracted fields or confirmed data, or saved file in needs_review/ready
  const isScannedOrSaved = (receipt.state === 'ready' || receipt.state === 'needs_review') &&
    (hasExtractedFields || hasConfirmedData || hasSavedFile);

  return hasUserEdits || isScannedOrSaved;
}
