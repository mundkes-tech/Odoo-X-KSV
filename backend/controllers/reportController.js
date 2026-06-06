const {
  getVendorPerformanceReport,
  getSpendingReport,
  getMonthlyTrendsReport,
  getDashboardSummary,
  listActivityLogs,
  getActivityLogById,
} = require('../services/reportService');

async function vendorPerformance(req, res, next) {
  try {
    const result = await getVendorPerformanceReport(req.query.vendorId, req.user);

    return res.status(200).json({
      success: true,
      message: 'Vendor performance report generated successfully.',
      data: result,
    });
  } catch (error) {
    return next(error);
  }
}

async function spending(req, res, next) {
  try {
    const result = await getSpendingReport(req.query || {}, req.user);

    return res.status(200).json({
      success: true,
      message: 'Spending report generated successfully.',
      data: result,
    });
  } catch (error) {
    return next(error);
  }
}

async function monthlyTrends(req, res, next) {
  try {
    const result = await getMonthlyTrendsReport(req.user);

    return res.status(200).json({
      success: true,
      message: 'Monthly trends generated successfully.',
      data: result,
    });
  } catch (error) {
    return next(error);
  }
}

async function dashboard(req, res, next) {
  try {
    const result = await getDashboardSummary(req.user);

    return res.status(200).json({
      success: true,
      message: 'Dashboard summary fetched successfully.',
      data: result,
    });
  } catch (error) {
    return next(error);
  }
}

async function activityLogs(req, res, next) {
  try {
    const result = await listActivityLogs(req.query || {}, req.user);

    return res.status(200).json({
      success: true,
      message: 'Activity logs fetched successfully.',
      data: result,
    });
  } catch (error) {
    return next(error);
  }
}

async function activityLogById(req, res, next) {
  try {
    const result = await getActivityLogById(req.params.id, req.user);

    return res.status(200).json({
      success: true,
      message: 'Activity log fetched successfully.',
      data: result,
    });
  } catch (error) {
    return next(error);
  }
}

module.exports = {
  vendorPerformance,
  spending,
  monthlyTrends,
  dashboard,
  activityLogs,
  activityLogById,
};