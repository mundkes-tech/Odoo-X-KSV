const {
  registerUser,
  loginUser,
  getUserProfileById,
  getAllUsers,
  updateUserById,
  resetUserPasswordById,
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

async function listUsers(req, res, next) {
  try {
    const result = await getAllUsers();
    return res.status(200).json({
      success: true,
      message: 'Users fetched successfully.',
      data: result,
    });
  } catch (error) {
    return next(error);
  }
}

async function updateUser(req, res, next) {
  try {
    const result = await updateUserById(req.params.id, req.body || {});
    return res.status(200).json({
      success: true,
      message: 'User updated successfully.',
      data: result,
    });
  } catch (error) {
    return next(error);
  }
}

async function resetPassword(req, res, next) {
  try {
    const { password } = req.body || {};
    if (!password) {
      return res.status(400).json({ success: false, message: 'password is required.' });
    }
    const result = await resetUserPasswordById(req.params.id, password);
    return res.status(200).json({
      success: true,
      message: 'Password reset successful.',
      data: result,
    });
  } catch (error) {
    return next(error);
  }
}

module.exports = {
  register,
  login,
  profile,
  adminOnly,
  managerOnly,
  vendorOnly,
  listUsers,
  updateUser,
  resetPassword,
};

