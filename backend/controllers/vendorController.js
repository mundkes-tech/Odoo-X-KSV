const {
  createVendor,
  listVendors,
  getVendorById,
  updateVendor,
  deleteVendor,
} = require('../services/vendorService');

async function create(req, res, next) {
  try {
    const vendor = await createVendor(req.body || {}, req.user);

    return res.status(201).json({
      success: true,
      message: 'Vendor created successfully.',
      data: vendor,
    });
  } catch (error) {
    return next(error);
  }
}

async function list(req, res, next) {
  try {
    const result = await listVendors(req.query || {});

    return res.status(200).json({
      success: true,
      message: 'Vendor list fetched successfully.',
      vendors: result.vendors,
      pagination: result.pagination,
    });
  } catch (error) {
    return next(error);
  }
}

async function getById(req, res, next) {
  try {
    const vendor = await getVendorById(req.params.id);

    return res.status(200).json({
      success: true,
      message: 'Vendor fetched successfully.',
      data: vendor,
    });
  } catch (error) {
    return next(error);
  }
}

async function update(req, res, next) {
  try {
    const vendor = await updateVendor(req.params.id, req.body || {}, req.user);

    return res.status(200).json({
      success: true,
      message: 'Vendor updated successfully.',
      data: vendor,
    });
  } catch (error) {
    return next(error);
  }
}

async function remove(req, res, next) {
  try {
    await deleteVendor(req.params.id, req.user);

    return res.status(200).json({
      success: true,
      message: 'Vendor deleted successfully.',
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
};
