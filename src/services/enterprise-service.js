class EnterpriseService {
  constructor({ store, subscriptionService }) {
    this.store = store;
    this.subscriptionService = subscriptionService;
  }

  async listEnterprises(options = {}) {
    const result = await this.store.getEnterprises(options);
    
    // Calculate total pages based on limit
    const limit = options.limit || 10;
    const page = options.page || 1;
    const totalPages = Math.ceil(result.total / limit);

    return { 
      ok: true, 
      enterprises: result.data,
      pagination: {
        total: result.total,
        page,
        limit,
        totalPages
      }
    };
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

  // Sanitizes inputs by trimming whitespace from strings
  _sanitize(data) {
    const sanitized = { ...data };
    for (const [key, value] of Object.entries(sanitized)) {
      if (typeof value === 'string') {
        sanitized[key] = value.trim();
      }
    }
    return sanitized;
  }

  // Shared validation logic for create and update
  _validate(data) {
    // 1. Length checks
    const maxLen200 = ['name', 'generalEmail', 'apiUrl', 'contactName', 'contactDesignation', 'contactEmail'];
    for (const field of maxLen200) {
      if (data[field] && data[field].length > 200) return { ok: false, error: `${field} must be less than 200 characters` };
    }
    if (data.hqStreet && data.hqStreet.length > 500) return { ok: false, error: 'Headquarters street address must be less than 500 characters' };
    if (data.hqCity && data.hqCity.length > 100) return { ok: false, error: 'City must be less than 100 characters' };
    if (data.hqState && data.hqState.length > 100) return { ok: false, error: 'State must be less than 100 characters' };

    // 2. Regex checks
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (data.generalEmail && !emailRegex.test(data.generalEmail)) return { ok: false, error: 'Invalid general email format' };
    if (data.contactEmail && !emailRegex.test(data.contactEmail)) return { ok: false, error: 'Invalid contact email format' };

    const gstinRegex = /^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z]{1}[1-9A-Z]{1}Z[0-9A-Z]{1}$/;
    if (data.gstinNumber && !gstinRegex.test(data.gstinNumber)) return { ok: false, error: 'Invalid GSTIN format. Expected: 22AAAAA0000A1Z5' };

    const panRegex = /^[A-Z]{5}[0-9]{4}[A-Z]{1}$/;
    if (data.panNumber && !panRegex.test(data.panNumber)) return { ok: false, error: 'Invalid PAN format. Expected: AAAAA0000A' };

    const pincodeRegex = /^[0-9]{6}$/;
    if (data.hqPincode && !pincodeRegex.test(data.hqPincode)) return { ok: false, error: 'Invalid pincode format. Expected: 6 digits' };

    // Allows digits, spaces, hyphens, plus, parenthesis, between 10-20 chars
    const phoneRegex = /^\+?[0-9\s\-()]{10,20}$/;
    if (data.generalPhone && !phoneRegex.test(data.generalPhone)) return { ok: false, error: 'Invalid general phone format. Examples: 1234567890 or +91 1234567890' };
    if (data.contactPhone && !phoneRegex.test(data.contactPhone)) return { ok: false, error: 'Invalid contact phone format. Examples: 1234567890 or +91 1234567890' };

    const urlRegex = /^https?:\/\/.+/i;
    if (data.apiUrl && !urlRegex.test(data.apiUrl)) return { ok: false, error: 'Invalid API URL format. Must start with http:// or https://' };

    // 3. Enum checks
    const validPlans = ['starter', 'professional', 'enterprise'];
    if (data.billingPlan && !validPlans.includes(data.billingPlan)) return { ok: false, error: 'Invalid billing plan. Must be: starter, professional, or enterprise' };

    const validCycles = ['monthly', 'quarterly', 'yearly'];
    if (data.billingCycle && !validCycles.includes(data.billingCycle)) return { ok: false, error: 'Invalid billing cycle. Must be: monthly, quarterly, or yearly' };

    const validStatuses = ['active', 'inactive', 'suspended'];
    if (data.status && !validStatuses.includes(data.status)) return { ok: false, error: 'Invalid status. Must be: active, inactive, or suspended' };

    // 4. Date check
    if (data.nextBillingDate) {
      if (isNaN(Date.parse(data.nextBillingDate))) {
        return { ok: false, error: 'Invalid nextBillingDate format' };
      }
    }

    return { ok: true };
  }

  async createEnterprise(rawData, createdBy) {
    const data = this._sanitize(rawData);

    // Enforce required fields
    if (!data.name || !data.generalEmail || !data.gstinNumber || !data.panNumber || !data.contactName || !data.contactEmail) {
      return { 
        ok: false, 
        error: 'Required fields: name, generalEmail, gstinNumber, panNumber, contactName, contactEmail' 
      };
    }

    const valResult = this._validate(data);
    if (!valResult.ok) return valResult;

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
            data.packageId || null,
            packageName.charAt(0).toUpperCase() + packageName.slice(1),
            billingCycle,
            amount,
            createdBy
          );

          if (!subResult.ok) {
            console.error(`⚠️ Failed to create subscription for enterprise ${enterprise.name}:`, subResult.error);
          }
        } catch (subError) {
          console.error(`⚠️ Exception while creating subscription for enterprise ${enterprise.name}:`, subError);
        }
      }

      return { ok: true, enterprise };
    } catch (error) {
      // Handle unique constraint violations
      if (error.message && error.message.includes('gstin')) return { ok: false, error: 'GSTIN number already exists' };
      if (error.message && error.message.includes('pan')) return { ok: false, error: 'PAN number already exists' };
      throw error;
    }
  }

  async updateEnterprise(id, rawData, updatedBy) {
    const data = this._sanitize(rawData);

    const existing = await this.store.getEnterpriseById(id);
    if (!existing) {
      return { ok: false, error: 'Enterprise not found' };
    }

    const valResult = this._validate(data);
    if (!valResult.ok) return valResult;

    try {
      const enterprise = await this.store.updateEnterprise(id, data, updatedBy);
      return { ok: true, enterprise };
    } catch (error) {
      if (error.message && error.message.includes('gstin')) return { ok: false, error: 'GSTIN number already exists' };
      if (error.message && error.message.includes('pan')) return { ok: false, error: 'PAN number already exists' };
      throw error;
    }
  }

  async deleteEnterprise(id, deletedBy) {
    const existing = await this.store.getEnterpriseById(id);
    if (!existing) return { ok: false, error: 'Enterprise not found' };

    await this.store.deleteEnterprise(id, deletedBy);
    return { ok: true, message: 'Enterprise deleted successfully' };
  }

  async restoreEnterprise(id, updatedBy) {
    await this.store.restoreEnterprise(id, updatedBy);
    return { ok: true, message: 'Enterprise restored successfully' };
  }
}

module.exports = { EnterpriseService };
