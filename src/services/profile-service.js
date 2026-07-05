const bcrypt = require('bcryptjs');

class ProfileService {
  constructor({ store }) {
    this.store = store;
  }

  async getProfile(userId) {
    const profile = await this.store.getUserProfile(userId);
    
    if (!profile) {
      return { ok: false, error: 'User not found' };
    }

    return { ok: true, profile };
  }

  async updateProfile(userId, data) {
    // Validate that at least one field is provided
    if (!data.displayName && !data.email) {
      return { ok: false, error: 'At least one field (displayName or email) must be provided' };
    }

    // Validate display name if provided
    if (data.displayName !== undefined) {
      const trimmedName = String(data.displayName || '').trim();
      if (!trimmedName) {
        return { ok: false, error: 'Display name cannot be empty' };
      }
      data.displayName = trimmedName;
    }

    // Validate email if provided
    if (data.email !== undefined) {
      const trimmedEmail = String(data.email || '').trim().toLowerCase();
      if (!trimmedEmail) {
        return { ok: false, error: 'Email cannot be empty' };
      }

      // Validate email format
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(trimmedEmail)) {
        return { ok: false, error: 'Invalid email format' };
      }

      data.email = trimmedEmail;

      // Check if email is already in use by another user
      const existingUser = await this.store.getAggregatorUserByEmail(trimmedEmail);
      if (existingUser && existingUser.id !== userId) {
        return { ok: false, error: 'Email address already in use' };
      }
    }

    try {
      // Update the profile
      const updatedProfile = await this.store.updateUserProfile(userId, data);

      return {
        ok: true,
        profile: updatedProfile,
        message: 'Profile updated successfully'
      };
    } catch (error) {
      console.error('Error updating profile:', error);
      
      // Handle unique constraint violations
      if (error.message && error.message.includes('email')) {
        return { ok: false, error: 'Email address already in use' };
      }
      
      throw error;
    }
  }

  async changePassword(userId, currentPassword, newPassword) {
    // Validate required fields
    if (!currentPassword || !newPassword) {
      return { ok: false, error: 'Current password and new password are required' };
    }

    // Validate new password strength
    if (newPassword.length < 8) {
      return { ok: false, error: 'New password must be at least 8 characters long' };
    }

    // Get the user's current password hash
    const passwordHash = await this.store.verifyUserPassword(userId);
    
    if (!passwordHash) {
      return { ok: false, error: 'User not found' };
    }

    // Verify the current password
    const isPasswordValid = await bcrypt.compare(currentPassword, passwordHash);
    
    if (!isPasswordValid) {
      return { ok: false, error: 'Current password is incorrect' };
    }

    // Hash the new password
    const newPasswordHash = await bcrypt.hash(newPassword, 10);

    // Update the password in the database
    await this.store.updateUserPassword(userId, newPasswordHash);

    return {
      ok: true,
      message: 'Password changed successfully'
    };
  }
}

module.exports = { ProfileService };
