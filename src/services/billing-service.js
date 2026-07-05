/**
 * Billing Service
 * Handles business logic for billing records management
 */

class BillingService {
  constructor(store) {
    this.store = store;
  }

  /**
   * Get all billing records with optional filters
   */
  async getAllBillingRecords(filters = {}) {
    try {
      const records = await this.store.getAllBillingRecords(filters);
      return { ok: true, records };
    } catch (error) {
      console.error('Error fetching billing records:', error);
      return { ok: false, error: error.message || 'Failed to fetch billing records' };
    }
  }

  /**
   * Get billing record details by ID
   */
  async getBillingRecordDetails(id) {
    if (!id) {
      return { ok: false, error: 'Billing record ID is required' };
    }

    try {
      const record = await this.store.getBillingRecordById(id);
      
      if (!record) {
        return { ok: false, error: 'Billing record not found' };
      }

      return { ok: true, record };
    } catch (error) {
      console.error('Error fetching billing record:', error);
      return { ok: false, error: error.message || 'Failed to fetch billing record' };
    }
  }

  /**
   * Get billing records for a specific enterprise
   */
  async getEnterpriseBillingRecords(enterpriseId) {
    if (!enterpriseId) {
      return { ok: false, error: 'Enterprise ID is required' };
    }

    try {
      const records = await this.store.getEnterpriseBillingRecords(enterpriseId);
      return { ok: true, records };
    } catch (error) {
      console.error('Error fetching enterprise billing records:', error);
      return { ok: false, error: error.message || 'Failed to fetch billing records' };
    }
  }

  /**
   * Mark billing record as paid
   */
  async markAsPaid(id, paymentMethod, paymentReference) {
    if (!id) {
      return { ok: false, error: 'Billing record ID is required' };
    }

    // Validate payment method if provided
    const validMethods = ['cash', 'card', 'bank_transfer', 'upi', 'cheque', 'other'];
    if (paymentMethod && !validMethods.includes(paymentMethod)) {
      return { ok: false, error: 'Invalid payment method' };
    }

    try {
      const record = await this.store.markBillingRecordPaid(
        id,
        paymentMethod || 'other',
        paymentReference
      );

      return { 
        ok: true, 
        record, 
        message: 'Billing record marked as paid successfully' 
      };
    } catch (error) {
      console.error('Error marking billing record as paid:', error);
      return { ok: false, error: error.message || 'Failed to mark as paid' };
    }
  }

  /**
   * Update billing record status
   */
  async updateStatus(id, status) {
    if (!id) {
      return { ok: false, error: 'Billing record ID is required' };
    }

    // Validate status
    const validStatuses = ['pending', 'paid', 'overdue', 'cancelled'];
    if (!validStatuses.includes(status)) {
      return { ok: false, error: 'Invalid status. Must be: pending, paid, overdue, or cancelled' };
    }

    try {
      const record = await this.store.updateBillingRecordStatus(id, status);
      return { 
        ok: true, 
        record, 
        message: 'Billing record status updated successfully' 
      };
    } catch (error) {
      console.error('Error updating billing record status:', error);
      return { ok: false, error: error.message || 'Failed to update status' };
    }
  }

  /**
   * Get billing statistics
   */
  async getStats() {
    try {
      const stats = await this.store.getBillingStats();
      return { ok: true, stats };
    } catch (error) {
      console.error('Error fetching billing stats:', error);
      return { ok: false, error: error.message || 'Failed to fetch statistics' };
    }
  }

  /**
   * Check and mark overdue billing records
   * Called by cron job daily
   */
  async checkOverdueRecords() {
    try {
      const today = new Date();
      today.setHours(0, 0, 0, 0);

      // Get all pending records with due date before today
      const pendingRecords = await this.store.getAllBillingRecords({
        status: 'pending'
      });

      let updatedCount = 0;
      const errors = [];

      for (const record of pendingRecords) {
        const dueDate = new Date(record.dueDate);
        dueDate.setHours(0, 0, 0, 0);

        if (dueDate < today) {
          try {
            await this.store.updateBillingRecordStatus(record.id, 'overdue');
            updatedCount++;
            console.log(`✅ Marked billing record ${record.id} as overdue`);
          } catch (error) {
            console.error(`❌ Failed to mark record ${record.id} as overdue:`, error);
            errors.push({ recordId: record.id, error: error.message });
          }
        }
      }

      return {
        ok: true,
        message: `Marked ${updatedCount} records as overdue`,
        updatedCount,
        errors: errors.length > 0 ? errors : undefined
      };
    } catch (error) {
      console.error('Error checking overdue records:', error);
      return { ok: false, error: error.message || 'Failed to check overdue records' };
    }
  }
}

module.exports = BillingService;
