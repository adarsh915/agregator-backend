class PermissionService {
  constructor({ store }) {
    this.store = store;
  }

  async listPermissions(filters = {}) {
    try {
      // If resource filter provided
      if (filters.resource) {
        const permissions = await this.store.getPermissionsByResource(filters.resource);
        return { ok: true, permissions };
      }

      // Get all permissions
      const permissions = await this.store.getAllPermissions();
      return { ok: true, permissions };
      
    } catch (error) {
      console.error('Error listing permissions:', error);
      return { ok: false, error: 'Failed to list permissions' };
    }
  }

  async getPermissionsByResource(resource) {
    try {
      const permissions = await this.store.getPermissionsByResource(resource);
      return { ok: true, permissions };
    } catch (error) {
      console.error('Error getting permissions by resource:', error);
      return { ok: false, error: 'Failed to get permissions' };
    }
  }

  // Group permissions by resource for easier frontend display
  async getPermissionsGroupedByResource() {
    try {
      const permissions = await this.store.getAllPermissions();
      
      const grouped = permissions.reduce((acc, perm) => {
        if (!acc[perm.resource]) {
          acc[perm.resource] = [];
        }
        acc[perm.resource].push(perm);
        return acc;
      }, {});

      return { ok: true, grouped };
    } catch (error) {
      console.error('Error grouping permissions:', error);
      return { ok: false, error: 'Failed to group permissions' };
    }
  }
}

module.exports = { PermissionService };
