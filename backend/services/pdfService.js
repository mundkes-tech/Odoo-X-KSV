const PDFDocument = require('pdfkit');
const { pool } = require('../config/db');
const { createHttpError } = require('./vendorService');

const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

function assertUuid(value, fieldName) {
  if (!value || !UUID_REGEX.test(String(value).trim())) {
    throw createHttpError(400, `${fieldName} must be a valid UUID.`);
  }
  return String(value).trim();
}

function getVendorIdFromActor(actor) {
  if (!actor || String(actor.role).toUpperCase() !== 'VENDOR') {
    return null;
  }

  return pool.query(`SELECT id FROM vendors WHERE email = $1 LIMIT 1;`, [actor.email]).then((result) => {
    return result.rowCount > 0 ? result.rows[0].id : null;
  });
}

function formatDate(value) {
  if (!value) {
    return '-';
  }

  return new Date(value).toLocaleString('en-IN', {
    year: 'numeric',
    month: 'short',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  });
}

function bufferFromPdfBuilder(builder) {
  return new Promise((resolve, reject) => {
    const chunks = [];
    builder.on('data', (chunk) => chunks.push(chunk));
    builder.on('end', () => resolve(Buffer.concat(chunks)));
    builder.on('error', reject);
    builder.end();
  });
}

function addCompanyHeader(doc, title) {
  doc
    .fillColor('#102A43')
    .fontSize(20)
    .text('VendorBridge ERP', { align: 'center' });

  doc
    .fillColor('#334E68')
    .fontSize(11)
    .text('Procurement, Approvals, Purchase Orders, Invoices, and Vendor Intelligence', { align: 'center' });

  doc.moveDown(0.5);
  doc
    .fillColor('#102A43')
    .fontSize(16)
    .text(title, { align: 'center' });
  doc.moveDown(1);
  doc.moveTo(50, doc.y).lineTo(545, doc.y).strokeColor('#BCCCDC').stroke();
  doc.moveDown(1);
}

function addSectionTitle(doc, title) {
  doc
    .fillColor('#102A43')
    .fontSize(13)
    .text(title)
    .moveDown(0.25);
}

function addKeyValue(doc, label, value) {
  const displayValue = value === undefined || value === null || value === '' ? '-' : String(value);
  doc
    .fontSize(10)
    .fillColor('#243B53')
    .text(`${label}: `, { continued: true })
    .fillColor('#102A43')
    .text(displayValue);
}

function addMoney(doc, label, value) {
  addKeyValue(doc, label, `₹${Number(value || 0).toFixed(2)}`);
}

async function loadPurchaseOrderDocument(poId, actor) {
  const validId = assertUuid(poId, 'purchaseOrderId');
  const result = await pool.query(
    `
      SELECT
        po.id,
        po.po_number,
        po.total_amount,
        po.status,
        po.created_at,
        q.id AS quotation_id,
        q.price AS quotation_price,
        q.delivery_days,
        q.comments AS quotation_comments,
        q.status AS quotation_status,
        q.submitted_at,
        r.id AS rfq_id,
        r.title AS rfq_title,
        r.description AS rfq_description,
        r.quantity AS rfq_quantity,
        r.deadline AS rfq_deadline,
        v.id AS vendor_id,
        v.company_name,
        v.gst_number,
        v.email,
        v.phone,
        v.address
      FROM purchase_orders po
      JOIN quotations q ON q.id = po.quotation_id
      JOIN rfqs r ON r.id = q.rfq_id
      JOIN vendors v ON v.id = po.vendor_id
      WHERE po.id = $1
      LIMIT 1;
    `,
    [validId]
  );

  if (result.rowCount === 0) {
    throw createHttpError(404, 'Purchase Order not found.');
  }

  const row = result.rows[0];
  const vendorId = await getVendorIdFromActor(actor);

  if (actor && String(actor.role).toUpperCase() === 'VENDOR' && !vendorId) {
    throw createHttpError(403, 'Access denied. Vendor profile not found for this user.');
  }

  if (vendorId && row.vendor_id !== vendorId) {
    throw createHttpError(403, 'Access denied. You can only access your own purchase orders.');
  }

  return row;
}

async function loadInvoiceDocument(invoiceId, actor) {
  const validId = assertUuid(invoiceId, 'invoiceId');
  const result = await pool.query(
    `
      SELECT
        inv.id,
        inv.invoice_number,
        inv.subtotal,
        inv.tax_amount,
        inv.total_amount,
        inv.status,
        inv.created_at,
        po.id AS purchase_order_id,
        po.po_number,
        po.created_at AS purchase_order_created_at,
        q.id AS quotation_id,
        q.price AS quotation_price,
        r.id AS rfq_id,
        r.title AS rfq_title,
        v.id AS vendor_id,
        v.company_name,
        v.gst_number,
        v.email,
        v.phone,
        v.address
      FROM invoices inv
      JOIN purchase_orders po ON po.id = inv.purchase_order_id
      JOIN quotations q ON q.id = po.quotation_id
      JOIN rfqs r ON r.id = q.rfq_id
      JOIN vendors v ON v.id = po.vendor_id
      WHERE inv.id = $1
      LIMIT 1;
    `,
    [validId]
  );

  if (result.rowCount === 0) {
    throw createHttpError(404, 'Invoice not found.');
  }

  const row = result.rows[0];
  const vendorId = await getVendorIdFromActor(actor);

  if (actor && String(actor.role).toUpperCase() === 'VENDOR' && !vendorId) {
    throw createHttpError(403, 'Access denied. Vendor profile not found for this user.');
  }

  if (vendorId && row.vendor_id !== vendorId) {
    throw createHttpError(403, 'Access denied. You can only access your own invoices.');
  }

  return row;
}

async function buildPurchaseOrderPdf(poId, actor) {
  const po = await loadPurchaseOrderDocument(poId, actor);
  const doc = new PDFDocument({ margin: 50, size: 'A4', bufferPages: true });

  doc.font('Helvetica');
  addCompanyHeader(doc, 'Purchase Order');

  addSectionTitle(doc, 'Purchase Order Details');
  addKeyValue(doc, 'PO Number', po.po_number);
  addKeyValue(doc, 'Status', po.status);
  addKeyValue(doc, 'Created On', formatDate(po.created_at));
  addMoney(doc, 'Total Amount', po.total_amount);

  doc.moveDown();
  addSectionTitle(doc, 'Vendor Details');
  addKeyValue(doc, 'Company Name', po.company_name);
  addKeyValue(doc, 'GST Number', po.gst_number);
  addKeyValue(doc, 'Email', po.email);
  addKeyValue(doc, 'Phone', po.phone);
  addKeyValue(doc, 'Address', po.address);

  doc.moveDown();
  addSectionTitle(doc, 'RFQ Details');
  addKeyValue(doc, 'RFQ Title', po.rfq_title);
  addKeyValue(doc, 'RFQ Description', po.rfq_description);
  addKeyValue(doc, 'Quantity', po.rfq_quantity);
  addKeyValue(doc, 'RFQ Deadline', formatDate(po.rfq_deadline));

  doc.moveDown();
  addSectionTitle(doc, 'Quotation Details');
  addKeyValue(doc, 'Quotation Status', po.quotation_status);
  addMoney(doc, 'Quotation Price', po.quotation_price);
  addKeyValue(doc, 'Delivery Days', po.delivery_days);
  addKeyValue(doc, 'Submitted On', formatDate(po.submitted_at));
  addKeyValue(doc, 'Comments', po.quotation_comments);

  return {
    buffer: await bufferFromPdfBuilder(doc),
    filename: `${po.po_number}.pdf`,
  };
}

async function buildInvoicePdf(invoiceId, actor) {
  const invoice = await loadInvoiceDocument(invoiceId, actor);
  const doc = new PDFDocument({ margin: 50, size: 'A4', bufferPages: true });

  doc.font('Helvetica');
  addCompanyHeader(doc, 'Invoice');

  addSectionTitle(doc, 'Invoice Details');
  addKeyValue(doc, 'Invoice Number', invoice.invoice_number);
  addKeyValue(doc, 'Status', invoice.status);
  addKeyValue(doc, 'Invoice Date', formatDate(invoice.created_at));

  doc.moveDown();
  addSectionTitle(doc, 'Vendor Details');
  addKeyValue(doc, 'Company Name', invoice.company_name);
  addKeyValue(doc, 'GST Number', invoice.gst_number);
  addKeyValue(doc, 'Email', invoice.email);
  addKeyValue(doc, 'Phone', invoice.phone);
  addKeyValue(doc, 'Address', invoice.address);

  doc.moveDown();
  addSectionTitle(doc, 'Purchase Order Details');
  addKeyValue(doc, 'PO Number', invoice.po_number);
  addKeyValue(doc, 'PO Created On', formatDate(invoice.purchase_order_created_at));
  addKeyValue(doc, 'RFQ Title', invoice.rfq_title);

  doc.moveDown();
  addSectionTitle(doc, 'Amount Summary');
  addMoney(doc, 'Subtotal', invoice.subtotal);
  addMoney(doc, 'GST', invoice.tax_amount);
  addMoney(doc, 'Total Amount', invoice.total_amount);

  return {
    buffer: await bufferFromPdfBuilder(doc),
    filename: `${invoice.invoice_number}.pdf`,
  };
}

module.exports = {
  buildPurchaseOrderPdf,
  buildInvoicePdf,
};