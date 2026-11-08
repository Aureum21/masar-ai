export const escapeHtml = value => String(value ?? '-').replace(/[&<>"']/g, char => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[char]));

export function eligibleForPrint(receipts, allowDemo = false) {
  return (receipts || []).filter(r => 
    r.state === 'ready' &&
    (!r.is_demo || allowDemo) &&
    r.status === 'eligible' && 
    r.currency === 'AED' && 
    r.estimated_refund != null && 
    Number.isFinite(Number(r.estimated_refund)) && 
    Number(r.estimated_refund) > 0
  );
}

export function refundTotal(receipts) { 
  return (receipts.reduce((sum, r) => sum + Math.round(Number(r.estimated_refund || 0) * 100), 0) / 100).toFixed(2); 
}

export function spendTotal(receipts) {
  return (receipts.reduce((sum, r) => sum + Math.round(Number(r.total_amount || 0) * 100), 0) / 100).toFixed(2);
}

const money = value => value == null || value === '' ? '-' : `${Number(value).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} AED`;

export function receiptPrintHtml(receipts, imageUrls = {}, baseOrigin = '') {
  const eligible = eligibleForPrint(receipts, true);
  const totalRefund = refundTotal(eligible);
  const totalSpend = spendTotal(eligible);
  
  // Table rows for the final summary page
  const summaryRows = eligible.map((r, idx) => `
    <tr>
      <td style="text-align: center; font-weight: 600;">${idx + 1}</td>
      <td>${escapeHtml(r.purchase_date || '-')}</td>
      <td><strong>${escapeHtml(r.merchant_name || 'Retailer')}</strong></td>
      <td style="text-align: right;">${escapeHtml(money(r.total_amount))}</td>
      <td style="text-align: right;">${escapeHtml(money(r.vat_amount))}</td>
      <td style="text-align: center;"><span class="badge-eligible">Possible refund</span></td>
      <td style="font-weight: 700; text-align: right; color: #047857;">${escapeHtml(money(r.estimated_refund))}</td>
    </tr>
  `).join('');

  // 1 Receipt per page
  const receiptPages = eligible.map((r, index) => {
    const rawImg = imageUrls[r.id] || r.image_url || '';
    const imgUrl = rawImg.startsWith('data:') || rawImg.startsWith('http') || !baseOrigin 
      ? rawImg 
      : `${baseOrigin.replace(/\/+$/, '')}/${rawImg.replace(/^\/+/, '')}`;

    return `
    <article class="receipt-page">
      <header>
        <div class="page-top-bar">
          <span class="page-count">Receipt Page ${index + 1} of ${eligible.length}</span>
          <span class="status-pill">Potentially eligible for tourist VAT refund</span>
        </div>
        <h1 class="merchant-title">${escapeHtml(r.merchant_name || 'Retailer')}</h1>
        <div class="receipt-meta">
          <span><strong>Purchase Date:</strong> ${escapeHtml(r.purchase_date || '-')}</span>
          ${r.category ? `<span><strong>Category:</strong> ${escapeHtml(r.category)}</span>` : ''}
          ${r.id ? `<span><strong>ID:</strong> ${escapeHtml(r.id)}</span>` : ''}
        </div>
        <div class="receipt-numbers">
          <div class="num-box">
            <span class="lbl">Amount Paid</span>
            <span class="val">${escapeHtml(money(r.total_amount))}</span>
          </div>
          <div class="num-box">
            <span class="lbl">VAT (5%)</span>
            <span class="val">${escapeHtml(money(r.vat_amount))}</span>
          </div>
          <div class="num-box refund">
            <span class="lbl">Estimated Refund</span>
            <span class="val">${escapeHtml(money(r.estimated_refund))}</span>
          </div>
        </div>
      </header>

      <div class="receipt-img-wrap">
        ${imgUrl ? `<img src="${escapeHtml(imgUrl)}" alt="Receipt image for ${escapeHtml(r.merchant_name)}" />` : '<div class="no-img">No receipt image attached</div>'}
      </div>

      <footer>
        <p><strong>Planet Tax-Free Validation Notice:</strong> Present your passport, original invoice, tax-free tag, and goods to a Planet validation kiosk or manned counter before baggage check-in at the airport. MASAR provides estimate calculations; final decision and payouts rest with Planet Payment.</p>
      </footer>
    </article>
  `;
  }).join('');

  const baseTag = baseOrigin ? `<base href="${escapeHtml(baseOrigin)}/">` : '';

  return `<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8">
  ${baseTag}
  <title>Receipt Refund Summary &amp; Vouchers</title>
  <style>
    @page {
      size: A4 portrait;
      margin: 12mm;
    }
    * { box-sizing: border-box; }
    body {
      margin: 0;
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
      color: #111827;
      background: #FFFFFF;
      font-size: 10.5pt;
      -webkit-print-color-adjust: exact;
      print-color-adjust: exact;
    }

    /* Print Break: 1 receipt per page */
    .receipt-page {
      height: 268mm;
      max-height: 268mm;
      display: flex;
      flex-direction: column;
      justify-content: space-between;
      break-after: page;
      page-break-after: always;
      overflow: hidden;
      padding-bottom: 4mm;
    }

    .page-top-bar {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: 2mm;
    }

    .page-count {
      font-size: 8.5pt;
      color: #6B7280;
      text-transform: uppercase;
      letter-spacing: 0.05em;
      font-weight: 600;
    }

    .status-pill {
      background: #ECFDF5;
      color: #065F46;
      border: 1px solid #A7F3D0;
      padding: 1.5mm 3.5mm;
      border-radius: 9999px;
      font-weight: 600;
      font-size: 8pt;
    }

    .merchant-title {
      font-size: 16pt;
      margin: 0 0 2.5mm 0;
      color: #111827;
      border-bottom: 1px solid #E5E7EB;
      padding-bottom: 2mm;
      line-height: 1.25;
    }

    .receipt-meta {
      display: flex;
      gap: 12mm;
      margin-bottom: 3mm;
      font-size: 9.5pt;
      color: #374151;
    }

    .receipt-numbers {
      display: grid;
      grid-template-columns: 1fr 1fr 1fr;
      gap: 3mm;
      background: #F9FAFB;
      border: 1px solid #E5E7EB;
      border-radius: 3mm;
      padding: 2.5mm 3.5mm;
      margin-bottom: 3.5mm;
    }

    .num-box {
      display: flex;
      flex-direction: column;
    }

    .num-box .lbl {
      font-size: 7.5pt;
      color: #6B7280;
      text-transform: uppercase;
      font-weight: 600;
      letter-spacing: 0.03em;
    }

    .num-box .val {
      font-size: 11.5pt;
      font-weight: 700;
      color: #111827;
    }

    .num-box.refund .val {
      color: #047857;
    }

    .receipt-img-wrap {
      flex: 1;
      min-height: 0;
      width: 100%;
      display: flex;
      align-items: center;
      justify-content: center;
      border: 1px solid #E5E7EB;
      border-radius: 3mm;
      background: #FAFAFA;
      padding: 2mm;
      overflow: hidden;
      margin-bottom: 3mm;
    }

    .receipt-img-wrap img {
      max-height: 100%;
      max-width: 100%;
      object-fit: contain;
    }

    .no-img {
      color: #9CA3AF;
      font-size: 10pt;
      font-style: italic;
    }

    .receipt-page footer {
      font-size: 7.5pt;
      color: #6B7280;
      line-height: 1.35;
      border-top: 1px solid #E5E7EB;
      padding-top: 2mm;
    }

    /* LAST PAGE: Summary Table */
    .summary {
      break-before: page;
      page-break-before: always;
      min-height: 265mm;
      display: flex;
      flex-direction: column;
      justify-content: flex-start;
      padding-top: 2mm;
    }

    .summary h1 {
      font-size: 18pt;
      margin: 0 0 2mm 0;
      color: #111827;
      border-bottom: 2px solid #F59E0B;
      padding-bottom: 2mm;
    }

    .summary p.desc {
      font-size: 9.5pt;
      color: #4B5563;
      margin: 0 0 5mm 0;
      line-height: 1.5;
    }

    table {
      width: 100%;
      border-collapse: collapse;
      font-size: 9.5pt;
      margin-bottom: 6mm;
    }

    th, td {
      padding: 3mm 2.5mm;
      border: 1px solid #D1D5DB;
    }

    th {
      background: #F3F4F6;
      color: #1F2937;
      font-weight: 700;
      text-align: left;
    }

    tr:nth-child(even) td {
      background: #F9FAFB;
    }

    .badge-eligible {
      color: #047857;
      font-weight: 700;
      background: #ECFDF5;
      padding: 1mm 2.5mm;
      border-radius: 9999px;
      font-size: 8pt;
      display: inline-block;
    }

    tr.total-row {
      background: #F3F4F6 !important;
      border-top: 2px solid #111827;
      border-bottom: 2px solid #111827;
    }

    tr.total-row td {
      font-size: 11pt;
      font-weight: 800;
      color: #111827;
      background: #E5E7EB !important;
      padding: 4mm 3mm;
    }

    .summary-footer {
      margin-top: auto;
      padding: 4mm;
      background: #F9FAFB;
      border: 1px solid #E5E7EB;
      border-radius: 3mm;
      font-size: 8pt;
      color: #4B5563;
      line-height: 1.45;
    }

    /* Screen preview controls */
    .no-print { display: none !important; }
    @media screen {
      .no-print {
        display: flex !important;
        gap: 12px;
        justify-content: flex-end;
        align-items: center;
        padding: 14px 24px;
        background: #111827;
        color: white;
        position: sticky;
        top: 0;
        z-index: 999;
        box-shadow: 0 4px 12px rgba(0,0,0,0.25);
      }
      .no-print .hint {
        margin-right: auto;
        font-size: 13px;
        color: #9CA3AF;
      }
      .no-print button {
        padding: 8px 18px;
        font-size: 13px;
        font-weight: 600;
        border-radius: 8px;
        cursor: pointer;
        border: 1px solid #4B5563;
        background: #1F2937;
        color: #F9FAFB;
      }
      .no-print button.primary {
        background: #F59E0B;
        color: #111827;
        border-color: #D97706;
        font-weight: 700;
      }
      body {
        max-width: 210mm;
        margin: 20px auto 40px auto;
        background: #E5E7EB;
        padding: 0;
      }
      .receipt-page, .summary {
        background: white;
        padding: 15mm;
        margin-bottom: 20px;
        border-radius: 6px;
        box-shadow: 0 4px 20px rgba(0,0,0,0.12);
        height: auto;
        min-height: 270mm;
      }
    }
  </style>
</head>
<body>
  <div class="no-print">
    <span class="hint">Previewing ${eligible.length} receipt voucher(s) + summary page</span>
    <button class="primary" onclick="window.print()">Print / Save as PDF</button>
    <button onclick="window.close()">Close Window</button>
  </div>

  ${receiptPages}

  <section class="summary">
    <h1>Summary of Possible VAT Refunds</h1>
    <p class="desc">
      Official tourist tax-free shopping records for departure validation with Planet Payment in the UAE. 
      Please ensure all goods, tax-free digital/physical tags, and original invoices are available upon departure.
    </p>

    <table>
      <thead>
        <tr>
          <th style="width: 35px; text-align: center;">#</th>
          <th style="width: 95px;">Date</th>
          <th>Store / Merchant</th>
          <th style="width: 110px; text-align: right;">Amount Paid</th>
          <th style="width: 90px; text-align: right;">VAT (5%)</th>
          <th style="width: 120px; text-align: center;">Status</th>
          <th style="width: 130px; text-align: right;">Possible Refund</th>
        </tr>
      </thead>
      <tbody>
        ${summaryRows}
        <tr class="total total-row">
          <td colspan="6" style="text-align: right; letter-spacing: 0.04em;">
            TOTAL SUM OF POSSIBLE REFUNDS:
          </td>
          <td style="text-align: right; color: #047857; font-size: 12pt;">
            ${totalRefund} AED
          </td>
        </tr>
      </tbody>
    </table>

    <div class="summary-footer">
      <strong>Departure Checkpoint Reminder:</strong>
      <p style="margin: 3px 0 0 0;">
        Before airline check-in, visit a Planet validation kiosk or serviced counter at Dubai International (DXB) or Zayed International (AUH). 
        Validate your digital/paper tags with your passport. Payout options (credit card, cash, or digital wallet) are issued directly by Planet Payment.
      </p>
    </div>
  </section>

  <script>
    window.addEventListener('load', function() {
      var imgs = Array.from(document.images);
      var pending = imgs.filter(function(img) { return !img.complete; });
      if (pending.length === 0) {
        setTimeout(function() {
          try { window.focus(); window.print(); } catch(e) {}
        }, 350);
      } else {
        var loaded = 0;
        pending.forEach(function(img) {
          img.onload = img.onerror = function() {
            loaded++;
            if (loaded === pending.length) {
              setTimeout(function() {
                try { window.focus(); window.print(); } catch(e) {}
              }, 350);
            }
          };
        });
      }
    });
  </script>
</body>
</html>`;
}
