import { Router } from 'express';
import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import { prisma } from '../lib/prisma';
import { authenticate, authorize } from '../middleware/auth';
const router = Router();

router.get('/me', authenticate, async (req, res) => {
  const user = await prisma.user.findUnique({
    where: { id: req.user!.userId },
    select: { id: true, email: true, name: true, phone: true, role: true, createdAt: true },
  });
  res.json(user);
});

router.post('/register', async (req, res) => {
  try {
    const { email, password, name, phone } = req.body;

    if (!email || !password || !name) {
      return res.status(400).json({ error: 'Email, password, and name are required.' });
    }

    const existingUser = await prisma.user.findUnique({ where: { email } });
    if (existingUser) {
      return res.status(409).json({ error: 'An account with this email already exists.' });
    }

    const passwordHash = await bcrypt.hash(password, 10);

    const user = await prisma.user.create({
      data: {
        email,
        password: passwordHash,
        name,
        phone,
      },
    });

    res.status(201).json({
      id: user.id,
      email: user.email,
      name: user.name,
      role: user.role,
    });
  } catch (error) {
    console.error('Register error:', error);
    res.status(500).json({ error: 'Something went wrong.' });
  }
});

router.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ error: 'Email and password are required.' });
    }

    const user = await prisma.user.findUnique({ where: { email } });
    if (!user) {
      return res.status(401).json({ error: 'Invalid email or password.' });
    }

    const passwordMatches = await bcrypt.compare(password, user.password);
    if (!passwordMatches) {
      return res.status(401).json({ error: 'Invalid email or password.' });
    }

    const token = jwt.sign(
      { userId: user.id, role: user.role },
      process.env.JWT_SECRET as string,
      { expiresIn: '7d' }
    );

    res.json({
      token,
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        role: user.role,
      },
    });
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({ error: 'Something went wrong.' });
  }
});

// POST /api/auth/staff — owner only: create a new staff account
router.post('/staff', authenticate, authorize('OWNER'), async (req, res) => {
  try {
    const { email, password, name, phone } = req.body;

    if (!email || !password || !name) {
      return res.status(400).json({ error: 'Email, password, and name are required.' });
    }
    if (password.length < 8) {
      return res.status(400).json({ error: 'Password must be at least 8 characters.' });
    }

    const existingUser = await prisma.user.findUnique({ where: { email } });
    if (existingUser) {
      return res.status(409).json({ error: 'An account with this email already exists.' });
    }

    const passwordHash = await bcrypt.hash(password, 10);

    const user = await prisma.user.create({
      data: {
        email,
        password: passwordHash,
        name,
        phone,
        role: 'STAFF',
      },
    });

    res.status(201).json({
      id: user.id,
      email: user.email,
      name: user.name,
      phone: user.phone,
      role: user.role,
      createdAt: user.createdAt,
    });
  } catch (error) {
    console.error('Create staff error:', error);
    res.status(500).json({ error: 'Something went wrong.' });
  }
});

// GET /api/auth/staff — owner only: list staff and owner accounts
router.get('/staff', authenticate, authorize('OWNER'), async (req, res) => {
  try {
    const users = await prisma.user.findMany({
      where: { role: { in: ['STAFF', 'OWNER'] } },
      select: { id: true, email: true, name: true, phone: true, role: true, createdAt: true },
      orderBy: { createdAt: 'desc' },
    });
    res.json(users);
  } catch (error) {
    console.error('List staff error:', error);
    res.status(500).json({ error: 'Something went wrong.' });
  }
});

// PATCH /api/auth/staff/:id/role — owner only: revoke staff access (STAFF -> CUSTOMER)
router.patch('/staff/:id/role', authenticate, authorize('OWNER'), async (req, res) => {
  try {
    const { role } = req.body;
    if (!['STAFF', 'CUSTOMER'].includes(role)) {
      return res.status(400).json({ error: 'Invalid role.' });
    }
    if (req.params.id === req.user!.userId) {
      return res.status(400).json({ error: 'You cannot change your own role.' });
    }

    const target = await prisma.user.findUnique({ where: { id: req.params.id } });
    if (!target) {
      return res.status(404).json({ error: 'User not found.' });
    }
    if (target.role === 'OWNER') {
      return res.status(403).json({ error: 'Cannot change an owner account.' });
    }

    const updated = await prisma.user.update({
      where: { id: req.params.id },
      data: { role },
      select: { id: true, email: true, name: true, phone: true, role: true, createdAt: true },
    });

    res.json(updated);
  } catch (error) {
    console.error('Update staff role error:', error);
    res.status(500).json({ error: 'Something went wrong.' });
  }
});

// PATCH /api/auth/staff/:id/password — owner only: reset a staff member's password
router.patch('/staff/:id/password', authenticate, authorize('OWNER'), async (req, res) => {
  try {
    const { password } = req.body;

    if (!password || password.length < 8) {
      return res.status(400).json({ error: 'Password must be at least 8 characters.' });
    }
    if (req.params.id === req.user!.userId) {
      return res.status(400).json({ error: 'You cannot reset your own password this way.' });
    }

    const target = await prisma.user.findUnique({ where: { id: req.params.id } });
    if (!target) {
      return res.status(404).json({ error: 'User not found.' });
    }
    if (target.role === 'OWNER') {
      return res.status(403).json({ error: "Cannot reset another owner's password." });
    }

    const passwordHash = await bcrypt.hash(password, 10);
    await prisma.user.update({
      where: { id: req.params.id },
      data: { password: passwordHash },
    });

    res.json({ success: true });
  } catch (error) {
    console.error('Reset staff password error:', error);
    res.status(500).json({ error: 'Something went wrong.' });
  }
});

export default router;