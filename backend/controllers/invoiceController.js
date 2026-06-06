const {
  createInvoice,
  getInvoices,
  getInvoiceById,
  updateInvoiceStatus,
} = require('../services/invoiceService');

async function create(req, res, next) {
  try {
    const result = await createInvoice(req.body || {}, req.user);
    return res.status(201).json({
      success: true,
      message: 'Invoice generated successfully.',
      data: result,
    });
  } catch (error) {
    return next(error);
  }
}

async function list(req, res, next) {
  try {
    const result = await getInvoices(req.query || {}, req.user);
    return res.status(200).json({
      success: true,
      message: 'Invoices fetched successfully.',
      data: result,
    });
  } catch (error) {
    return next(error);
  }
}

async function getById(req, res, next) {
  try {
    const result = await getInvoiceById(req.params.id, req.user);
    return res.status(200).json({
      success: true,
      message: 'Invoice fetched successfully.',
      data: result,
    });
  } catch (error) {
    return next(error);
  }
}

async function updateStatus(req, res, next) {
  try {
    const result = await updateInvoiceStatus(req.params.id, req.body || {}, req.user);
    return res.status(200).json({
      success: true,
      message: 'Invoice status updated successfully.',
      data: result,
    });
  } catch (error) {
    return next(error);
  }
}

module.exports = {
  create,
  list,
  getById,
  updateStatus,
};
