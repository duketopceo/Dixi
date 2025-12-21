import { body, param, query, validationResult } from 'express-validator';
import { Request, Response, NextFunction } from 'express';
import logger from '../utils/logger';

// Middleware to check validation results
export const validate = (req: Request, res: Response, next: NextFunction) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    logger.warn('Validation failed', { errors: errors.array(), path: req.path });
    return res.status(400).json({
      error: 'Validation failed',
      details: errors.array()
    });
  }
  next();
};

// AI inference validation
export const validateAIInfer = [
  body('query')
    .isString()
    .trim()
    .isLength({ min: 1, max: 5000 })
    .withMessage('Query must be between 1 and 5000 characters'),
  body('context')
    .optional()
    .isObject()
    .withMessage('Context must be an object'),
  validate
];

// AI initialization validation
export const validateAIInit = [
  body('modelPath')
    .optional()
    .isString()
    .trim()
    .withMessage('Model path must be a string'),
  body('modelSize')
    .optional()
    .isIn(['7B', '13B', '30B', '70B'])
    .withMessage('Model size must be one of: 7B, 13B, 30B, 70B'),
  validate
];

// Projection mapping validation
export const validateProjectionMapping = [
  body('calibrationData')
    .optional()
    .isObject()
    .withMessage('Calibration data must be an object'),
  body('transform')
    .optional()
    .isObject()
    .withMessage('Transform must be an object'),
  validate
];

// Projection content validation
export const validateProjectionContent = [
  body('content')
    .exists()
    .withMessage('Content is required'),
  body('position')
    .optional()
    .isObject()
    .withMessage('Position must be an object'),
  body('style')
    .optional()
    .isObject()
    .withMessage('Style must be an object'),
  validate
];

// Gesture process validation
export const validateGestureProcess = [
  body('type')
    .optional()
    .isString()
    .trim()
    .isIn(['point', 'pinch', 'swipe_left', 'swipe_right', 'grab', 'open_palm', 'unknown'])
    .withMessage('Invalid gesture type'),
  body('position')
    .optional()
    .isObject()
    .withMessage('Position must be an object'),
  body('position.x')
    .optional()
    .isFloat({ min: -1, max: 1 })
    .withMessage('Position x must be between -1 and 1'),
  body('position.y')
    .optional()
    .isFloat({ min: -1, max: 1 })
    .withMessage('Position y must be between -1 and 1'),
  body('confidence')
    .optional()
    .isFloat({ min: 0, max: 1 })
    .withMessage('Confidence must be between 0 and 1'),
  validate
];
