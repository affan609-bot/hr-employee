import jwt from 'jsonwebtoken';
import db from '../db.js';

const JWT_SECRET = process.env.JWT_SECRET || 'hcm_lite_jwt_super_secret_key_2026';

export const generateToken = (user) => {
  return jwt.sign(
    {
      id: user.id,
      email: user.email,
      name: user.name,
      role: user.role,
      employeeId: user.employeeId || null,
      mustChangePassword: user.mustChangePassword || false
    },
    JWT_SECRET,
    { expiresIn: '7d' }
  );
};

export const authenticate = (req, res, next) => {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Authentication required. No token provided.' });
  }

  const token = authHeader.split(' ')[1];
  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    const users = db.get('users');
    const user = users.find(u => u.id === decoded.id);

    if (!user || user.status === 'inactive') {
      return res.status(401).json({ error: 'User not found or account is deactivated.' });
    }

    req.user = {
      ...decoded,
      status: user.status,
      mustChangePassword: user.mustChangePassword
    };
    next();
  } catch (err) {
    return res.status(401).json({ error: 'Invalid or expired token.' });
  }
};

export const requireRole = (...roles) => {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({ error: 'Authentication required.' });
    }
    if (!roles.includes(req.user.role)) {
      return res.status(403).json({ error: `Forbidden: role '${req.user.role}' does not have access.` });
    }
    next();
  };
};

// Data-scope guard: Employee can only access rows matching their own employeeId
export const ensureEmployeeScope = (req, targetEmployeeId) => {
  if (req.user.role === 'admin' || req.user.role === 'hr') {
    return true; // Admin and HR have company/all access
  }
  if (req.user.role === 'employee') {
    return req.user.employeeId && req.user.employeeId === targetEmployeeId;
  }
  return false;
};
