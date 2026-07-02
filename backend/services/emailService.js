const nodemailer = require('nodemailer');
const { createHttpError } = require('./vendorService');
const { buildInvoicePdf, buildPurchaseOrderPdf } = require('./pdfService');
const { DEFAULT_VENDOR_TEMP_PASSWORD } = require('./authService');

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

async function sendVendorCredentialsEmail({ email, companyName, temporaryPassword }) {
  const recipient = assertEmail(email);
  const password = temporaryPassword || DEFAULT_VENDOR_TEMP_PASSWORD;
  const subject = 'VendorBridge Vendor Account Created';
  const text = [
    'Your account has been created.',
    '',
    `Email: ${recipient}`,
    `Temporary Password: ${password}`,
    '',
    'Please change password after first login.',
  ].join('\n');

  if (!process.env.SMTP_HOST) {
    console.info('[VendorBridge] Vendor credentials created:', {
      email: recipient,
      companyName: companyName || null,
      temporaryPassword: password,
    });
    return { delivered: false, mode: 'console', email: recipient, temporaryPassword: password };
  }

  try {
    const transporter = createTransporter();
    const info = await transporter.sendMail({
      from: getFromAddress(),
      to: recipient,
      subject,
      text,
      html: `
        <p>Your account has been created.</p>
        <p><strong>Email:</strong> ${recipient}</p>
        <p><strong>Temporary Password:</strong> ${password}</p>
        <p>Please change password after first login.</p>
      `,
    });

    return {
      delivered: true,
      mode: 'email',
      email: recipient,
      messageId: info.messageId || null,
    };
  } catch (error) {
    console.info('[VendorBridge] SMTP delivery failed; logging vendor credentials instead.', {
      email: recipient,
      companyName: companyName || null,
      temporaryPassword: password,
      error: error.message,
    });

    return { delivered: false, mode: 'console', email: recipient, temporaryPassword: password };
  }
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
  sendVendorCredentialsEmail,
  sendInvoiceEmail,
  sendPurchaseOrderEmail,
};