import express from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { supabase, supabaseAdmin } from '../lib/supabase.js';
import { requireAuth } from '../lib/requireAuth.js';

const router = express.Router();

// Helper to create the RLS-compatible JWT
const generateToken = (user) => {
  // Must match the exact shape expected by Supabase RLS
  const payload = {
    sub: user.id,
    role: "authenticated",
    email: user.email,
  };
  // Token expires in 7 days
  return jwt.sign(payload, process.env.SUPABASE_JWT_SECRET, { expiresIn: '7d' });
};

router.post('/signup', async (req, res) => {
  const { email, password } = req.body;
  if (!email || !password || password.length < 8) {
    return res.status(400).json({ error: 'Email and a password of at least 8 characters are required.' });
  }

  try {
    const emailLower = email.toLowerCase();
    
    // Check if user exists
    const { data: existingUser } = await supabaseAdmin
      .from('users')
      .select('id')
      .eq('email', emailLower)
      .maybeSingle();
      
    if (existingUser) {
      return res.status(400).json({ error: 'User already exists.' });
    }

    // Hash password
    const salt = await bcrypt.genSalt(10);
    const password_hash = await bcrypt.hash(password, salt);

    // Insert user
    const { data: newUser, error } = await supabaseAdmin
      .from('users')
      .insert({ email: emailLower, password_hash })
      .select('id, email, created_at, last_login_at')
      .single();

    if (error) throw error;

    const token = generateToken(newUser);
    res.json({ token, user: newUser });
  } catch (err) {
    console.error('Signup error:', err);
    res.status(500).json({ error: 'Internal server error during signup.' });
  }
});

router.post('/login', async (req, res) => {
  const { email, password } = req.body;
  if (!email || !password) {
    return res.status(400).json({ error: 'Email and password are required.' });
  }

  try {
    const emailLower = email.toLowerCase();
    
    // Find user
    const { data: user, error } = await supabaseAdmin
      .from('users')
      .select('*')
      .eq('email', emailLower)
      .maybeSingle();

    if (error || !user) {
      return res.status(401).json({ error: 'Invalid email or password.' });
    }

    // Check password
    const isMatch = await bcrypt.compare(password, user.password_hash);
    if (!isMatch) {
      return res.status(401).json({ error: 'Invalid email or password.' });
    }

    // Update last login
    await supabaseAdmin.from('users').update({ last_login_at: new Date().toISOString() }).eq('id', user.id);

    // Remove password_hash from response
    delete user.password_hash;
    
    const token = generateToken(user);
    res.json({ token, user });
  } catch (err) {
    console.error('Login error:', err);
    res.status(500).json({ error: 'Internal server error during login.' });
  }
});

router.get('/me', requireAuth, async (req, res) => {
  try {
    const { data: user, error } = await supabaseAdmin
      .from('users')
      .select('id, email, created_at, last_login_at')
      .eq('id', req.userId)
      .maybeSingle();

    if (error || !user) {
      return res.status(404).json({ error: 'User not found' });
    }

    res.json({ user });
  } catch (err) {
    res.status(500).json({ error: 'Internal server error' });
  }
});

export default router;
