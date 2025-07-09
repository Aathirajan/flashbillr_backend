import { Request, Response, NextFunction } from 'express';

/**
 * Middleware to validate product images in multipart/form-data requests.
 * @param required - If true, at least one image is required (for create). If false, images are optional (for update).
 */
export function validateProductImages(required: boolean) {
  return (req: Request, res: Response, next: NextFunction) => {
    const files = req.files as Express.Multer.File[] | undefined;
    if (required) {
      if (!files || files.length === 0) {
        return res.status(400).json({ message: 'At least one product image is required.' });
      }
    }
    if (files && files.length > 5) {
      return res.status(400).json({ message: 'You can upload up to 5 images per product.' });
    }
    return next();
  };
}
