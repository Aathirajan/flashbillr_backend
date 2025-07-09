import express from 'express';
import { prisma } from '../utils/database';
import Joi from 'joi';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { sendCustomerVerificationEmail } from '../services/mailgun';
import { authenticateCustomer, AuthenticatedCustomerRequest } from '../middleware/customerAuth';
import {
  customerRegisterLimiter,
  customerLoginLimiter,
  customerForgotLimiter,
  customerResendVerificationLimiter
} from '../middleware/rateLimiters';

const router = express.Router();

// Validation schemas
const registerSchema = Joi.object({
    email: Joi.string().email().required(),
    password: Joi.string().min(8).required(),
    firstName: Joi.string().required(),
    lastName: Joi.string().required(),
    phone: Joi.string().pattern(/^[0-9]{10,15}$/).required(),
    storeId: Joi.string().required(),
});

const loginSchema = Joi.object({
    email: Joi.string().email().required(),
    password: Joi.string().required(),
    storeId: Joi.string().required(),
});

// Register endpoint
router.post('/register', customerRegisterLimiter, async (req, res, next) => {
    try {
        const { error, value } = registerSchema.validate(req.body);
        if (error) return res.status(400).json({ error: error.details[0].message });
        const { email, password, firstName, lastName, phone, storeId } = value;
        const existing = await prisma.customer.findFirst({ where: { email, storeId } });
        if (existing) return res.status(409).json({ error: 'Email already registered for this store' });
        const hashed = await bcrypt.hash(password, 12);
        const token = jwt.sign({ email, storeId }, process.env.JWT_SECRET || 'changeme', { expiresIn: '1d' });
        const customer = await prisma.customer.create({
            data: {
                email,
                password: hashed,
                emailVerificationToken: token,
                emailVerified: false,
                firstName,
                lastName,
                phone,
                storeId,
                isGuest: false,
            }
        });
        await sendCustomerVerificationEmail(email, token, firstName);
       return res.status(201).json({ message: 'Registration successful. Please verify your email.' });
    } catch (err) {
        return next(err);
    }
});

// Email verification endpoint
router.get('/verify-email', async (req, res, next) => {
    try {
        const { token } = req.query;
        if (!token || typeof token !== 'string') return res.status(400).json({ error: 'Invalid verification link' });
        let payload;
        try {
            payload = jwt.verify(token, process.env.JWT_SECRET || 'changeme');
        } catch {
            return res.status(400).json({ error: 'Invalid or expired verification link' });
        }
        const { email, storeId } = payload as { email: string; storeId: string };
        const customer = await prisma.customer.findFirst({ where: { email, storeId, emailVerificationToken: token } });
        if (!customer) return res.status(400).json({ error: 'Invalid verification link' });
        await prisma.customer.update({
            where: { id: customer.id },
            data: { emailVerified: true, emailVerificationToken: null }
        });
       return res.json({ message: 'Email verified successfully. You can now log in.' });
    } catch (err) {
        return next(err);
    }
});

// Login endpoint
router.post('/login', customerLoginLimiter, async (req, res, next) => {
    try {
        const { error, value } = loginSchema.validate(req.body);
        if (error) return res.status(400).json({ error: error.details[0].message });
        const { email, password, storeId } = value;
        const customer = await prisma.customer.findFirst({ where: { email, storeId } });
        if (!customer || !customer.password) return res.status(401).json({ error: 'Invalid credentials' });
        if (!customer.emailVerified) return res.status(403).json({ error: 'Email not verified' });
        const match = await bcrypt.compare(password, customer.password);
        if (!match) return res.status(401).json({ error: 'Invalid credentials' });
        const token = jwt.sign({ customerId: customer.id, email, storeId }, process.env.JWT_SECRET || 'changeme', { expiresIn: '7d' });
        res.json({ token, customer: { id: customer.id, email, firstName: customer.firstName, lastName: customer.lastName, phone: customer.phone } });
    } catch (err) {
        return next(err);
    }
});

// Get current customer profile
router.get('/profile', authenticateCustomer, async (req: AuthenticatedCustomerRequest, res, next) => {
  try {
    const { customerId } = req.customer!;
    const customer = await prisma.customer.findUnique({
      where: { id: customerId },
      select: { id: true, email: true, firstName: true, lastName: true, phone: true, emailVerified: true }
    });
    if (!customer) return res.status(404).json({ error: 'Customer not found' });
    res.json({ customer });
  } catch (err) { return next(err); }
});

// Update customer profile
router.put('/profile', authenticateCustomer, async (req: AuthenticatedCustomerRequest, res, next) => {
  try {
    const { customerId } = req.customer!;
    const { firstName, lastName, phone } = req.body;
    const updated = await prisma.customer.update({
      where: { id: customerId },
      data: { firstName, lastName, phone },
      select: { id: true, email: true, firstName: true, lastName: true, phone: true, emailVerified: true }
    });
    return res.json({ customer: updated });
  } catch (err) { return next(err); }
});

// Get order history for customer
router.get('/orders', authenticateCustomer, async (req: AuthenticatedCustomerRequest, res, next) => {
  try {
    const { customerId } = req.customer!;
    const orders = await prisma.order.findMany({
      where: { customerId },
      orderBy: { createdAt: 'desc' },
      include: { orderItems: true, address: true }
    });
    return res.json({ orders });
  } catch (err) { return next(err); }
});

// Request password reset
router.post('/forgot-password', customerForgotLimiter, async (req, res, next) => {
  try {
    const { email, storeId } = req.body;
    if (!email || !storeId) return res.status(400).json({ error: 'Email and storeId required' });
    const customer = await prisma.customer.findFirst({ where: { email, storeId } });
    if (!customer) return res.json({ message: 'If the email exists, a reset link has been sent.' });
    const resetToken = jwt.sign({ customerId: customer.id, email, storeId }, process.env.JWT_SECRET || 'changeme', { expiresIn: '1h' });
    await prisma.customer.update({ where: { id: customer.id }, data: { emailVerificationToken: resetToken } });
    // Reuse verification email for reset (could make a new template)
    const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:3000';
    const resetUrl = `${frontendUrl}/reset-customer-password?token=${resetToken}`;
    const subject = 'Reset your password for Flashbillr';
    const html = `<p>Hi${customer.firstName ? ' ' + customer.firstName : ''},</p><p>Click below to reset your password:</p><p><a href="${resetUrl}">Reset Password</a></p>`;
    await sendCustomerVerificationEmail(email, resetToken, customer.firstName);
    return res.json({ message: 'If the email exists, a reset link has been sent.' });
  } catch (err) { return next(err); }
});

// Resend verification email
router.post('/resend-verification', customerResendVerificationLimiter, async (req, res, next) => {
  try {
    const { email, storeId } = req.body;
    if (!email || !storeId) return res.status(400).json({ error: 'Email and storeId required' });
    const customer = await prisma.customer.findFirst({ where: { email, storeId } });
    if (!customer) return res.json({ message: 'If the email exists, a verification link has been sent.' });
    if (customer.emailVerified) return res.json({ message: 'Email is already verified.' });
    const token = jwt.sign({ email, storeId }, process.env.JWT_SECRET || 'changeme', { expiresIn: '1d' });
    await prisma.customer.update({ where: { id: customer.id }, data: { emailVerificationToken: token } });
    await sendCustomerVerificationEmail(email, token, customer.firstName, storeId);
    return res.json({ message: 'Verification email sent.' });
  } catch (err) { return next(err); }
});

// Reset password
router.post('/reset-password', async (req, res, next) => {
  try {
    const { token, password } = req.body;
    if (!token || !password) return res.status(400).json({ error: 'Token and new password required' });
    let payload;
    try {
      payload = jwt.verify(token, process.env.JWT_SECRET || 'changeme');
    } catch {
      return res.status(400).json({ error: 'Invalid or expired token' });
    }
    const { customerId } = payload as { customerId: string };
    const hashed = await bcrypt.hash(password, 12);
    await prisma.customer.update({ where: { id: customerId }, data: { password: hashed, emailVerificationToken: null } });
    return res.json({ message: 'Password reset successful. You can now log in.' });
  } catch (err) { return next(err); }
});

export default router;
