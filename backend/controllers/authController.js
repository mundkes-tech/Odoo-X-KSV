const {
  registerUser,
  loginUser,
  getUserProfileById,
} = require('../services/authService');

async function register(req, res, next) {
  try {
    const user = await registerUser(req.body || {});

    return res.status(201).json({
      success: true,
      message: 'User registered successfully.',
      data: user,
    });
  } catch (error) {
    return next(error);
  }
}

async function login(req, res, next) {
  try {
    const authData = await loginUser(req.body || {});

    return res.status(200).json({
      success: true,
      message: 'Login successful.',
      token: authData.token,
      user: authData.user,
    });
  } catch (error) {
    return next(error);
  }
}

async function profile(req, res, next) {
  try {
    const user = await getUserProfileById(req.user.id);

    return res.status(200).json({
      success: true,
      message: 'Profile fetched successfully.',
      data: user,
    });
  } catch (error) {
    return next(error);
  }
}

function adminOnly(req, res) {
  return res.status(200).json({
    success: true,
    message: 'Admin route access granted.',
    data: {
      user: req.user,
      scope: 'ADMIN_ONLY',
    },
  });
}

function managerOnly(req, res) {
  return res.status(200).json({
    success: true,
    message: 'Manager route access granted.',
    data: {
      user: req.user,
      scope: 'MANAGER_ONLY',
    },
  });
}

function vendorOnly(req, res) {
  return res.status(200).json({
    success: true,
    message: 'Vendor route access granted.',
    data: {
      user: req.user,
      scope: 'VENDOR_ONLY',
    },
  });
}

module.exports = {
  register,
  login,
  profile,
  adminOnly,
  managerOnly,
  vendorOnly,
};
