const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');

class AuthService {
  constructor({ store, env }) {
    this.store = store;
    this.env = env;
  }

  getPublicAuthState(session, user = null) {
    return {
      isAuthenticated: !!session?.isAuthenticated,
      email: session?.email || '',
      userId: session?.userId || '',
      displayName: user?.displayName || '',
      role: user?.role || '',
      backendBaseUrl: this.env.backendBaseUrl,
      expiresAt: session?.expiresAt || null
    };
  }

  async login({ email, password }) {
    const user = await this.store.getAggregatorUserByEmail(email);
    
    if (!user || !user.isActive) {
      return { ok: false, error: 'Invalid credentials' };
    }

    const isValid = await bcrypt.compare(String(password || ''), user.passwordHash);
    if (!isValid) {
      return { ok: false, error: 'Invalid credentials' };
    }

    const token = jwt.sign(
      { 
        email: user.email,
        role: user.role
      },
      this.env.jwtSecret,
      { 
        subject: user.id,
        expiresIn: this.env.jwtExpiresInSeconds
      }
    );

    const session = {
      isAuthenticated: true,
      email: user.email,
      userId: user.id,
      authToken: token,
      issuedAt: Date.now(),
      expiresAt: Date.now() + this.env.jwtExpiresInSeconds * 1000
    };

    await this.store.createSession(token, session);

    return {
      ok: true,
      auth: this.getPublicAuthState(session, user),
      response: {
        userId: user.id,
        email: user.email,
        displayName: user.displayName,
        role: user.role,
        token,
        expiresInSeconds: this.env.jwtExpiresInSeconds
      }
    };
  }

  async logout(token) {
    await this.store.deleteSession(token);
    return { ok: true };
  }

  async getSession(token) {
    return this.store.getSession(token);
  }

  async getUserProfile(userId) {
    const user = await this.store.getAggregatorUserById(userId);
    if (!user) {
      return { ok: false, error: 'User not found' };
    }

    return {
      ok: true,
      profile: {
        id: user.id,
        email: user.email,
        displayName: user.displayName,
        role: user.role
      }
    };
  }
}

module.exports = { AuthService };
