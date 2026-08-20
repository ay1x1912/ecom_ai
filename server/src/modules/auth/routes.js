import { Router } from 'express';
import { validate } from '../../middleware/validate.js';
import { authenticate } from '../../middleware/authenticate.js';
import { loginLimiter, registerLimiter } from '../../middleware/rateLimit.js';
import { registerSchema, loginSchema } from './schema.js';
import { register, login, profile, logout } from './controller.js';

export const authRoutes = Router();

authRoutes.post('/register', registerLimiter, validate({ body: registerSchema }), register);
authRoutes.post('/login', loginLimiter, validate({ body: loginSchema }), login);
authRoutes.get('/profile', authenticate, profile);
authRoutes.post('/logout', authenticate, logout);

export default authRoutes;
