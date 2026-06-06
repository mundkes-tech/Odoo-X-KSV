const {
  createRfq,
  listRfqs,
  getRfqById,
  updateRfq,
  deleteRfq,
  assignVendorsToRfq,
  getRfqVendors,
  getVendorRfqs,
} = require('../services/rfqService');

async function create(req, res, next) {
  try {
    const rfq = await createRfq(req.body || {}, req.user);

    return res.status(201).json({
      success: true,
      message: 'RFQ created successfully.',
      data: rfq,
    });
  } catch (error) {
    return next(error);
  }
}

async function list(req, res, next) {
  try {
    const result = await listRfqs(req.query || {});

    return res.status(200).json({
      success: true,
      message: 'RFQ list fetched successfully.',
      rfqs: result.rfqs,
      pagination: result.pagination,
    });
  } catch (error) {
    return next(error);
  }
}

async function getById(req, res, next) {
  try {
    const rfq = await getRfqById(req.params.id, req.user);

    return res.status(200).json({
      success: true,
      message: 'RFQ fetched successfully.',
      data: rfq,
    });
  } catch (error) {
    return next(error);
  }
}

async function update(req, res, next) {
  try {
    const rfq = await updateRfq(req.params.id, req.body || {}, req.user);

    return res.status(200).json({
      success: true,
      message: 'RFQ updated successfully.',
      data: rfq,
    });
  } catch (error) {
    return next(error);
  }
}

async function remove(req, res, next) {
  try {
    await deleteRfq(req.params.id, req.user);

    return res.status(200).json({
      success: true,
      message: 'RFQ deleted successfully.',
    });
  } catch (error) {
    return next(error);
  }
}

async function assignVendors(req, res, next) {
  try {
    const result = await assignVendorsToRfq(req.params.id, req.body || {}, req.user);

    return res.status(201).json({
      success: true,
      message: 'Vendors assigned to RFQ successfully.',
      data: result,
    });
  } catch (error) {
    return next(error);
  }
}

async function listVendors(req, res, next) {
  try {
    const vendors = await getRfqVendors(req.params.id, req.user);

    return res.status(200).json({
      success: true,
      message: 'RFQ vendors fetched successfully.',
      vendors,
    });
  } catch (error) {
    return next(error);
  }
}

async function listVendorRfqs(req, res, next) {
  try {
    const rfqs = await getVendorRfqs(req.params.vendorId, req.user);

    return res.status(200).json({
      success: true,
      message: 'Vendor RFQs fetched successfully.',
      rfqs,
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
  remove,
  assignVendors,
  listVendors,
  listVendorRfqs,
};
