class EnterpriseService {
  constructor({ store, subscriptionService }) {
    this.store = store;
    this.subscriptionService = subscriptionService;
  }

  async listEnterprises() {
    const enterprises = await this.store.getEnterprises();
    return { ok: true, enterprises };
  }

  async getStats() {
    const stats = await this.store.getEnterpriseStats();
    return { ok: true, stats };
  }


  async getEnterpriseById(id) {
    const enterprise = await this.store.getEnterpriseById(id);
    
    if (!enterprise) {
      return { ok: false, error: 'Enterprise not found' };
    }

    return { ok: true, enterprise };
  }

  async createEnterprise(data, createdBy) {
    // Validate required fields
    if (!data.name || !data.generalEmail || !data.gstinNumber || !data.panNumber || !data.contactName || !data.contactEmail) {
      return { 
        ok: false, 
        error: 'Required fields: name, generalEmail, gstinNumber, panNumber, contactName, contactEmail' 
      };
    }

    // Validate email formats
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(data.generalEmail)) {
      return { ok: false, error: 'Invalid general email format' };
    }
    if (!emailRegex.test(data.contactEmail)) {
      return { ok: false, error: 'Invalid contact email format' };
    }

    // Validate GSTIN format (22AAAAA0000A1Z5)
    const gstinRegex = /^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z]{1}[1-9A-Z]{1}Z[0-9A-Z]{1}$/;
    if (!gstinRegex.test(data.gstinNumber)) {
      return { ok: false, error: 'Invalid GSTIN format. Expected: 22AAAAA0000A1Z5' };
    }

    // Validate PAN format (AAAAA0000A)
    const panRegex = /^[A-Z]{5}[0-9]{4}[A-Z]{1}$/;
    if (!panRegex.test(data.panNumber)) {
      return { ok: false, error: 'Invalid PAN format. Expected: AAAAA0000A' };
    }

    // Validate pincode if provided (6 digits)
    if (data.hqPincode) {
      const pincodeRegex = /^[0-9]{6}$/;
      if (!pincodeRegex.test(data.hqPincode)) {
        return { ok: false, error: 'Invalid pincode format. Expected: 6 digits' };
      }
    }

    // Validate billing plan
    const validPlans = ['starter', 'professional', 'enterprise'];
    if (data.billingPlan && !validPlans.includes(data.billingPlan)) {
      return { ok: false, error: 'Invalid billing plan. Must be: starter, professional, or enterprise' };
    }

    // Validate billing cycle
    const validCycles = ['monthly', 'quarterly', 'yearly'];
    if (data.billingCycle && !validCycles.includes(data.billingCycle)) {
      return { ok: false, error: 'Invalid billing cycle. Must be: monthly, quarterly, or yearly' };
    }

    // Validate status
    const validStatuses = ['active', 'inactive', 'suspended'];
    if (data.status && !validStatuses.includes(data.status)) {
      return { ok: false, error: 'Invalid status. Must be: active, inactive, or suspended' };
    }

    try {
      // Create enterprise
      const enterprise = await this.store.createEnterprise({
        name: data.name,
        logoUrl: data.logoUrl,
        logoStoragePath: data.logoStoragePath,
        generalPhone: data.generalPhone,
        generalEmail: data.generalEmail,
        apiUrl: data.apiUrl,
        gstinNumber: data.gstinNumber,
        panNumber: data.panNumber,
        hqStreet: data.hqStreet,
        hqCity: data.hqCity,
        hqState: data.hqState,
        hqPincode: data.hqPincode,
        status: data.status || 'active',
        billingPlan: data.billingPlan || 'starter',
        billingCycle: data.billingCycle || 'monthly',
        billingAmount: data.billingAmount || 0,
        nextBillingDate: data.nextBillingDate,
        contactName: data.contactName,
        contactDesignation: data.contactDesignation,
        contactEmail: data.contactEmail,
        contactPhone: data.contactPhone
      }, createdBy);

      // Auto-create subscription if billing amount is set
      if (this.subscriptionService && enterprise.billingAmount && enterprise.billingAmount > 0) {
        try {
          const packageName = data.billingPlan || 'starter';
          const billingCycle = data.billingCycle || 'monthly';
          const amount = enterprise.billingAmount;

          const subResult = await this.subscriptionService.createSubscription(
            enterprise.id,
            data.packageId || null, // packageId might not be set
            packageName.charAt(0).toUpperCase() + packageName.slice(1), // Capitalize
            billingCycle,
            amount,
            createdBy
          );

          if (!subResult.ok) {
            console.error(`⚠️ Failed to create subscription for enterprise ${enterprise.name}:`, subResult.error);
            // Don't fail the enterprise creation, just log the error
          } else {
            console.log(`✅ Auto-created subscription for enterprise: ${enterprise.name}`);
          }
        } catch (subError) {
          console.error(`⚠️ Exception while creating subscription for enterprise ${enterprise.name}:`, subError);
          // Don't fail the enterprise creation, just log the error
        }
      }

      return { ok: true, enterprise };
    } catch (error) {
      console.error('Error creating enterprise:', error);
      // Handle unique constraint violations
      if (error.message && error.message.includes('gstin')) {
        return { ok: false, error: 'GSTIN number already exists' };
      }
      if (error.message && error.message.includes('pan')) {
        return { ok: false, error: 'PAN number already exists' };
      }
      return { ok: false, error: error.message || 'Failed to create enterprise' };
    }
  }

  async updateEnterprise(id, data, updatedBy) {
    // Check if enterprise exists
    const existing = await this.store.getEnterpriseById(id);
    if (!existing) {
      return { ok: false, error: 'Enterprise not found' };
    }

    // Validate email formats if provided
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (data.generalEmail && !emailRegex.test(data.generalEmail)) {
      return { ok: false, error: 'Invalid general email format' };
    }
    if (data.contactEmail && !emailRegex.test(data.contactEmail)) {
      return { ok: false, error: 'Invalid contact email format' };
    }

    // Validate GSTIN if provided
    if (data.gstinNumber) {
      const gstinRegex = /^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z]{1}[1-9A-Z]{1}Z[0-9A-Z]{1}$/;
      if (!gstinRegex.test(data.gstinNumber)) {
        return { ok: false, error: 'Invalid GSTIN format' };
      }
    }

    // Validate PAN if provided
    if (data.panNumber) {
      const panRegex = /^[A-Z]{5}[0-9]{4}[A-Z]{1}$/;
      if (!panRegex.test(data.panNumber)) {
        return { ok: false, error: 'Invalid PAN format' };
      }
    }

    // Validate pincode if provided
    if (data.hqPincode) {
      const pincodeRegex = /^[0-9]{6}$/;
      if (!pincodeRegex.test(data.hqPincode)) {
        return { ok: false, error: 'Invalid pincode format. Expected: 6 digits' };
      }
    }

    // Validate billing plan if provided
    if (data.billingPlan) {
      const validPlans = ['starter', 'professional', 'enterprise'];
      if (!validPlans.includes(data.billingPlan)) {
        return { ok: false, error: 'Invalid billing plan' };
      }
    }

    // Validate billing cycle if provided
    if (data.billingCycle) {
      const validCycles = ['monthly', 'quarterly', 'yearly'];
      if (!validCycles.includes(data.billingCycle)) {
        return { ok: false, error: 'Invalid billing cycle' };
      }
    }

    // Validate status if provided
    if (data.status) {
      const validStatuses = ['active', 'inactive', 'suspended'];
      if (!validStatuses.includes(data.status)) {
        return { ok: false, error: 'Invalid status' };
      }
    }

    try {
      // Update enterprise
      const enterprise = await this.store.updateEnterprise(id, data, updatedBy);
      return { ok: true, enterprise };
    } catch (error) {
      console.error('Error updating enterprise:', error);
      // Handle unique constraint violations
      if (error.message && error.message.includes('gstin')) {
        return { ok: false, error: 'GSTIN number already exists' };
      }
      if (error.message && error.message.includes('pan')) {
        return { ok: false, error: 'PAN number already exists' };
      }
      return { ok: false, error: error.message || 'Failed to update enterprise' };
    }
  }

  async deleteEnterprise(id, deletedBy) {
    // Check if enterprise exists
    const existing = await this.store.getEnterpriseById(id);
    if (!existing) {
      return { ok: false, error: 'Enterprise not found' };
    }

    // Soft delete enterprise
    await this.store.deleteEnterprise(id, deletedBy);

    return { ok: true, message: 'Enterprise deleted successfully' };
  }

  async restoreEnterprise(id, updatedBy) {
    // Restore soft-deleted enterprise
    await this.store.restoreEnterprise(id, updatedBy);

    return { ok: true, message: 'Enterprise restored successfully' };
  }
}

module.exports = { EnterpriseService };
