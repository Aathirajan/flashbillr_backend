import Joi from 'joi';

export const createStoreAdminSchema = Joi.object({
  email: Joi.string().email().required(),
  firstName: Joi.string().min(2).max(50).required(),
  lastName: Joi.string().min(2).max(50).required(),
  storeId: Joi.string().required(),
  phone: Joi.string().pattern(/^[6-9]\d{9}$/).optional()
});
