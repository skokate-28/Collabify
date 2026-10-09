const express = require('express');
const { body } = require('express-validator');
const router = express.Router();
const authController = require('../controllers/auth.controller');
const { verifyToken } = require('../middleware/auth.middleware');
const validate = require('../middleware/validate.middleware');

router.post(
  '/register',
  validate([
    body('name').notEmpty().withMessage('Name is required').trim(),
    body('email').isEmail().withMessage('Please enter a valid email address').normalizeEmail(),
    body('password').isLength({ min: 6 }).withMessage('Password must be at least 6 characters long'),
  ]),
  authController.register
);

router.post(
  '/login',
  validate([
    body('email').isEmail().withMessage('Please enter a valid email address').normalizeEmail(),
    body('password').notEmpty().withMessage('Password is required'),
  ]),
  authController.login
);

router.post('/refresh', authController.refresh);

router.post('/logout', authController.logout);

router.get('/me', verifyToken, authController.getMe);

module.exports = router;
