const { validationResult } = require('express-validator');
const apiResponse = require('../utils/apiResponse');

const validate = (validations) => {
  return async (req, res, next) => {
    // Run all validations
    await Promise.all(validations.map(validation => validation.run(req)));

    const errors = validationResult(req);
    if (errors.isEmpty()) {
      return next();
    }

    // Return custom error format
    const extractedErrors = {};
    errors.array().forEach(err => {
      extractedErrors[err.path] = err.msg;
    });

    return apiResponse.error(res, 'Validation failed', 400, extractedErrors);
  };
};

module.exports = validate;
