const {
  createPurchaseOrder,
  getPurchaseOrders,
  getPurchaseOrderById,
  updatePurchaseOrderStatus,
} = require('../services/purchaseOrderService');

async function create(req, res, next) {
  try {
    const result = await createPurchaseOrder(req.body || {}, req.user);

    return res.status(201).json({
      success: true,
      message: 'Purchase Order generated successfully.',
      data: result,
    });
  } catch (error) {
    return next(error);
  }
}

async function getAll(req, res, next) {
  try {
    const filters = {
      status: req.query.status,
      vendorId: req.query.vendorId,
      page: req.query.page,
      limit: req.query.limit,
    };
    const result = await getPurchaseOrders(filters, req.user);

    return res.status(200).json({
      success: true,
      message: 'Purchase Orders fetched successfully.',
      data: result,
    });
  } catch (error) {
    return next(error);
  }
}

async function getById(req, res, next) {
  try {
    const result = await getPurchaseOrderById(req.params.id, req.user);

    return res.status(200).json({
      success: true,
      message: 'Purchase Order fetched successfully.',
      data: result,
    });
  } catch (error) {
    return next(error);
  }
}

async function updateStatus(req, res, next) {
  try {
    const result = await updatePurchaseOrderStatus(req.params.id, req.body || {}, req.user);

    return res.status(200).json({
      success: true,
      message: 'Purchase Order status updated successfully.',
      data: result,
    });
  } catch (error) {
    return next(error);
  }
}

module.exports = {
  create,
  getAll,
  getById,
  updateStatus,
};
