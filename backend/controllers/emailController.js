const { sendInvoiceEmail, sendPurchaseOrderEmail } = require('../services/emailService');

async function invoice(req, res, next) {
  try {
    const result = await sendInvoiceEmail(req.body || {}, req.user);

    return res.status(200).json({
      success: true,
      message: 'Invoice email sent successfully.',
      data: result,
    });
  } catch (error) {
    return next(error);
  }
}

async function purchaseOrder(req, res, next) {
  try {
    const result = await sendPurchaseOrderEmail(req.body || {}, req.user);

    return res.status(200).json({
      success: true,
      message: 'Purchase order email sent successfully.',
      data: result,
    });
  } catch (error) {
    return next(error);
  }
}

module.exports = {
  invoice,
  purchaseOrder,
};