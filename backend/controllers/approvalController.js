const {
  createApproval,
  approveApproval,
  rejectApproval,
  getApproval,
  getApprovals,
} = require('../services/approvalService');

async function create(req, res, next) {
  try {
    const result = await createApproval(req.body || {}, req.user);

    return res.status(201).json({
      success: true,
      message: 'Approval request initiated successfully.',
      data: result,
    });
  } catch (error) {
    return next(error);
  }
}

async function approve(req, res, next) {
  try {
    const result = await approveApproval(req.params.id, req.body || {}, req.user);

    return res.status(200).json({
      success: true,
      message: 'Approval request approved successfully.',
      data: result,
    });
  } catch (error) {
    return next(error);
  }
}

async function reject(req, res, next) {
  try {
    const result = await rejectApproval(req.params.id, req.body || {}, req.user);

    return res.status(200).json({
      success: true,
      message: 'Approval request rejected successfully.',
      data: result,
    });
  } catch (error) {
    return next(error);
  }
}

async function getById(req, res, next) {
  try {
    const result = await getApproval(req.params.id, req.user);

    return res.status(200).json({
      success: true,
      message: 'Approval request fetched successfully.',
      data: result,
    });
  } catch (error) {
    return next(error);
  }
}

async function list(req, res, next) {
  try {
    const result = await getApprovals(req.query || {}, req.user);
    return res.status(200).json({
      success: true,
      message: 'Approval requests fetched successfully.',
      data: result,
    });
  } catch (error) {
    return next(error);
  }
}

module.exports = {
  create,
  approve,
  reject,
  getById,
  list,
};
