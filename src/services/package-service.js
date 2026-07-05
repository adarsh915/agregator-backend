class PackageService {
  constructor({ store }) {
    this.store = store;
  }

  async listPackages(includeInactive = false) {
    const packages = await this.store.listPackages(includeInactive);
    return { ok: true, packages };
  }

  async getPackage(id) {
    const pkg = await this.store.getPackageById(id);
    if (!pkg) {
      throw new Error('Package not found');
    }
    return { ok: true, package: pkg };
  }

  async createPackage(pkgData) {
    // Validate minimal fields
    if (!pkgData.name) {
      throw new Error('Package name is required');
    }
    
    // Convert string array to valid JSONB
    if (typeof pkgData.features === 'string') {
      try {
        pkgData.features = JSON.parse(pkgData.features);
      } catch (e) {
        pkgData.features = [pkgData.features];
      }
    }

    const created = await this.store.createPackage(pkgData);
    return { ok: true, package: created };
  }

  async updatePackage(id, updates) {
    if (typeof updates.features === 'string') {
      try {
        updates.features = JSON.parse(updates.features);
      } catch (e) {
        updates.features = [updates.features];
      }
    }
    
    const updated = await this.store.updatePackage(id, updates);
    return { ok: true, package: updated };
  }

  async deletePackage(id) {
    await this.store.softDeletePackage(id);
    return { ok: true, message: 'Package deactivated successfully' };
  }
}

module.exports = { PackageService };
