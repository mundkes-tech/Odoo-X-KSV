const { getComparison, selectVendor } = require('../services/comparisonService');

async function comparison(req, res, next) {
  try {
    const result = await getComparison(req.params.rfqId, req.query || {}, req.user);

    return res.status(200).json({
      success: true,
      message: 'Quotation comparison fetched successfully.',
      data: result,
    });
  } catch (error) {
    return next(error);
  }
}

async function select(req, res, next) {
  try {
    const result = await selectVendor(req.params.rfqId, req.body || {}, req.user);

    return res.status(200).json({
      success: true,
      message: 'Vendor selected successfully.',
      data: result,
    });
  } catch (error) {
    return next(error);
  }
}

module.exports = {
  comparison,
  select,
};
