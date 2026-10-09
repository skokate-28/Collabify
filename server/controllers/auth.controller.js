const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const User = require('../models/User');
const generateTokens = require('../utils/generateTokens');
const apiResponse = require('../utils/apiResponse');

const register = async (req, res) => {
  try {
    const { name, email, password } = req.body;

    const existingUser = await User.findOne({ email });
    if (existingUser) {
      return apiResponse.error(res, 'Email already in use', 400);
    }

    const hashedPassword = await bcrypt.hash(password, 10);
    const user = await User.create({
      name,
      email,
      password: hashedPassword,
    });

    const accessToken = await generateTokens(res, user._id);

    return apiResponse.success(
      res,
      {
        user: {
          id: user._id,
          name: user.name,
          email: user.email,
          avatar: user.avatar,
          bio: user.bio,
        },
        accessToken,
      },
      'Registered successfully',
      201
    );
  } catch (error) {
    return apiResponse.error(res, error.message, 500);
  }
};

const login = async (req, res) => {
  try {
    const { email, password } = req.body;

    const user = await User.findOne({ email });
    if (!user) {
      return apiResponse.error(res, 'Invalid email or password', 400);
    }

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      return apiResponse.error(res, 'Invalid email or password', 400);
    }

    const accessToken = await generateTokens(res, user._id);

    return apiResponse.success(
      res,
      {
        user: {
          id: user._id,
          name: user.name,
          email: user.email,
          avatar: user.avatar,
          bio: user.bio,
        },
        accessToken,
      },
      'Logged in successfully'
    );
  } catch (error) {
    return apiResponse.error(res, error.message, 500);
  }
};

const refresh = async (req, res) => {
  try {
    // Parse cookie manually to avoid requiring extra package
    const cookies = req.headers.cookie
      ? Object.fromEntries(
          req.headers.cookie.split('; ').map(c => {
            const parts = c.split('=');
            return [parts[0], parts.slice(1).join('=')];
          })
        )
      : {};

    const refreshToken = cookies.refreshToken;
    if (!refreshToken) {
      return apiResponse.error(res, 'Refresh token missing', 401);
    }

    let decoded;
    try {
      decoded = jwt.verify(refreshToken, process.env.JWT_REFRESH_SECRET);
    } catch (err) {
      return apiResponse.error(res, 'Refresh token expired or invalid', 401);
    }

    const user = await User.findById(decoded.userId);
    if (!user || user.refreshToken !== refreshToken) {
      return apiResponse.error(res, 'Invalid session or token revoked', 401);
    }

    const accessToken = jwt.sign(
      { userId: user._id },
      process.env.JWT_ACCESS_SECRET,
      { expiresIn: process.env.JWT_ACCESS_EXPIRES || '15m' }
    );

    return apiResponse.success(res, { accessToken }, 'Token refreshed');
  } catch (error) {
    return apiResponse.error(res, error.message, 500);
  }
};

const logout = async (req, res) => {
  try {
    const cookies = req.headers.cookie
      ? Object.fromEntries(
          req.headers.cookie.split('; ').map(c => {
            const parts = c.split('=');
            return [parts[0], parts.slice(1).join('=')];
          })
        )
      : {};

    const refreshToken = cookies.refreshToken;
    if (refreshToken) {
      // Decode user without verifying (or verifying, if not expired yet) to null in DB
      try {
        const decoded = jwt.decode(refreshToken);
        if (decoded && decoded.userId) {
          await User.findByIdAndUpdate(decoded.userId, { refreshToken: null });
        }
      } catch (e) {
        // Safe to ignore decode errors on logout
      }
    }

    res.clearCookie('refreshToken', {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
    });

    return apiResponse.success(res, null, 'Logged out successfully');
  } catch (error) {
    return apiResponse.error(res, error.message, 500);
  }
};

const getMe = async (req, res) => {
  try {
    const user = await User.findById(req.user.userId).select('-password');
    if (!user) {
      return apiResponse.error(res, 'User not found', 404);
    }
    return apiResponse.success(res, user, 'User profile fetched');
  } catch (error) {
    return apiResponse.error(res, error.message, 500);
  }
};

module.exports = {
  register,
  login,
  refresh,
  logout,
  getMe,
};
