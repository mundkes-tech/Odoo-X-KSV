const nodemailer = require('nodemailer');
const { createHttpError } = require('./vendorService');
const { buildInvoicePdf, buildPurchaseOrderPdf } = require('./pdfService');

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function assertEmail(value) {
  const normalized = String(value || '').trim().toLowerCase();
  if (!normalized || !EMAIL_REGEX.test(normalized)) {
    throw createHttpError(400, 'email must be a valid email address.');
  }
  return normalized;
}

function createTransporter() {
  if (process.env.SMTP_HOST) {
    if (!process.env.SMTP_USER || !process.env.SMTP_PASS) {
      throw createHttpError(500, 'SMTP credentials are missing.');
    }

    return nodemailer.createTransport({
      host: process.env.SMTP_HOST,
      port: Number(process.env.SMTP_PORT) || 587,
      secure: String(process.env.SMTP_SECURE).toLowerCase() === 'true',
      auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASS,
      },
    });
  }

  return nodemailer.createTransport({ jsonTransport: true });
}

function getFromAddress() {
  const email = process.env.EMAIL_FROM || process.env.SMTP_USER || 'no-reply@vendorbridge.local';
  const displayName = process.env.EMAIL_FROM_NAME || 'VendorBridge';

  return `${displayName} <${email}>`;
}

async function sendInvoiceEmail(payload, actor) {
  if (!payload || !payload.invoiceId) {
    throw createHttpError(400, 'invoiceId is required.');
  }

  const email = assertEmail(payload.email);
  const pdf = await buildInvoicePdf(payload.invoiceId, actor);
  const transporter = createTransporter();

  const info = await transporter.sendMail({
    from: getFromAddress(),
    to: email,
    subject: `VendorBridge ERP - Invoice ${pdf.filename.replace('.pdf', '')}`,
    text: `Please find attached the invoice ${pdf.filename.replace('.pdf', '')}.`,
    html: `
      <p>Hello,</p>
      <p>Please find attached your invoice from VendorBridge ERP.</p>
      <p>Invoice: <strong>${pdf.filename.replace('.pdf', '')}</strong></p>
      <p>Regards,<br />VendorBridge ERP</p>
    `,
    attachments: [
      {
        filename: pdf.filename,
        content: pdf.buffer,
        contentType: 'application/pdf',
      },
    ],
  });

  return {
    email,
    filename: pdf.filename,
    messageId: info.messageId || null,
    accepted: info.accepted || [],
    rejected: info.rejected || [],
  };
}

async function sendPurchaseOrderEmail(payload, actor) {
  if (!payload || !payload.purchaseOrderId) {
    throw createHttpError(400, 'purchaseOrderId is required.');
  }

  const email = assertEmail(payload.email);
  const pdf = await buildPurchaseOrderPdf(payload.purchaseOrderId, actor);
  const transporter = createTransporter();

  const info = await transporter.sendMail({
    from: getFromAddress(),
    to: email,
    subject: `VendorBridge ERP - Purchase Order ${pdf.filename.replace('.pdf', '')}`,
    text: `Please find attached the purchase order ${pdf.filename.replace('.pdf', '')}.`,
    html: `
      <p>Hello,</p>
      <p>Please find attached your purchase order from VendorBridge ERP.</p>
      <p>Purchase Order: <strong>${pdf.filename.replace('.pdf', '')}</strong></p>
      <p>Regards,<br />VendorBridge ERP</p>
    `,
    attachments: [
      {
        filename: pdf.filename,
        content: pdf.buffer,
        contentType: 'application/pdf',
      },
    ],
  });

  return {
    email,
    filename: pdf.filename,
    messageId: info.messageId || null,
    accepted: info.accepted || [],
    rejected: info.rejected || [],
  };
}

module.exports = {
  sendInvoiceEmail,
  sendPurchaseOrderEmail,
};