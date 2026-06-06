const { buildPurchaseOrderPdf, buildInvoicePdf } = require('../services/pdfService');

async function purchaseOrderPdf(req, res, next) {
  try {
    const result = await buildPurchaseOrderPdf(req.params.id, req.user);

    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="${result.filename}"`);

    return res.status(200).send(result.buffer);
  } catch (error) {
    return next(error);
  }
}

async function invoicePdf(req, res, next) {
  try {
    const result = await buildInvoicePdf(req.params.id, req.user);

    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="${result.filename}"`);

    return res.status(200).send(result.buffer);
  } catch (error) {
    return next(error);
  }
}

module.exports = {
  purchaseOrderPdf,
  invoicePdf,
};