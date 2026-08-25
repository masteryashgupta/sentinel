import jwt from 'jsonwebtoken';


export const requireAuth = (req, res, next) => {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Missing or invalid authorization header' });
  }

  const token = authHeader.split(' ')[1];

  if (!process.env.SUPABASE_JWT_SECRET) {
    console.warn("WARNING: SUPABASE_JWT_SECRET is not set. Auth will fail.");
    return res.status(500).json({ error: 'Server misconfiguration' });
  }

  try {
    const decoded = jwt.verify(token, process.env.SUPABASE_JWT_SECRET);
    req.userId = decoded.sub;
    req.userEmail = decoded.email;
    req.token = token; // Store token so we can pass it to Supabase client (Approach A)
    next();
  } catch (err) {
    console.error('JWT Verification failed:', err.message);
    return res.status(401).json({ error: 'Unauthorized' });
  }
};
