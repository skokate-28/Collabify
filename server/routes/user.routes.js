const express = require('express');
const { body } = require('express-validator');
const router = express.Router();
const userController = require('../controllers/user.controller');
const { verifyToken } = require('../middleware/auth.middleware');
const validate = require('../middleware/validate.middleware');
const upload = require('../middleware/upload.middleware');

router.use(verifyToken);

router.get('/dashboard-stats', userController.getDashboardStats);

router.patch('/profile', upload.single('avatar'), userController.updateProfile);

router.patch(
  '/change-password',
  validate([
    body('newPassword').isLength({ min: 6 }).withMessage('New password must be at least 6 characters long'),
    body('confirmPassword').notEmpty().withMessage('Password confirmation is required'),
  ]),
  userController.changePassword
);

module.exports = router;
