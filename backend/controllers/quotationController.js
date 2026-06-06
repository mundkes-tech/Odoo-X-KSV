const {
  createQuotation,
  listQuotations,
  getQuotationById,
  updateQuotation,
} = require('../services/quotationService');

async function create(req, res, next) {
  try {
    const quotation = await createQuotation(req.body || {}, req.user);

    return res.status(201).json({
      success: true,
      message: 'Quotation submitted successfully.',
      data: quotation,
    });
  } catch (error) {
    return next(error);
  }
}

async function list(req, res, next) {
  try {
    const result = await listQuotations(req.query || {}, req.user);

    return res.status(200).json({
      success: true,
      message: 'Quotation list fetched successfully.',
      quotations: result.quotations,
      pagination: result.pagination,
    });
  } catch (error) {
    return next(error);
  }
}

async function getById(req, res, next) {
  try {
    const quotation = await getQuotationById(req.params.id, req.user);

    return res.status(200).json({
      success: true,
      message: 'Quotation fetched successfully.',
      data: quotation,
    });
  } catch (error) {
    return next(error);
  }
}

async function update(req, res, next) {
  try {
    const quotation = await updateQuotation(req.params.id, req.body || {}, req.user);

    return res.status(200).json({
      success: true,
      message: 'Quotation updated successfully.',
      data: quotation,
    });
  } catch (error) {
    return next(error);
  }
}

module.exports = {
  create,
  list,
  getById,
  update,
};
