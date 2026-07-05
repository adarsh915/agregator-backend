/**
 * Subscription Service
 * Handles business logic for subscription management
 */

class SubscriptionService {
  constructor(store) {
    this.store = store;
  }

  /**
   * Create subscription for an enterprise
   */
  async createSubscription(enterpriseId, packageId, packageName, billingCycle, amount, userId) {
    console.log('🔄 Creating subscription:', { enterpriseId, packageName, billingCycle, amount });
    
    // Validation
    if (!enterpriseId) {
      console.error('❌ Subscription creation failed: Enterprise ID is required');
      return { ok: false, error: 'Enterprise ID is required' };
    }
    if (!packageName || packageName.trim() === '') {
      console.error('❌ Subscription creation failed: Package name is required');
      return { ok: false, error: 'Package name is required' };
    }
    if (!amount || amount <= 0) {
      console.error('❌ Subscription creation failed: Amount must be greater than 0');
      return { ok: false, error: 'Amount must be greater than 0' };
    }
    if (!['monthly', 'quarterly', 'yearly'].includes(billingCycle)) {
      console.error('❌ Subscription creation failed: Invalid billing cycle:', billingCycle);
      return { ok: false, error: 'Invalid billing cycle' };
    }

    try {
      // Check if subscription already exists
      const existing = await this.store.getSubscriptionByEnterprise(enterpriseId);
      if (existing) {
        console.log('⚠️ Subscription already exists for enterprise:', enterpriseId);
        return { ok: false, error: 'Subscription already exists for this enterprise' };
      }

      // Create subscription
      const subscription = await this.store.createSubscription(
        enterpriseId,
        packageId,
        packageName,
        billingCycle,
        amount,
        userId
      );

      console.log('✅ Subscription created:', subscription.id);

      // Create first billing record
      await this.store.createBillingRecord(
        subscription.id,
        enterpriseId,
        subscription.currentPeriodStart,
        subscription.currentPeriodEnd,
        billingCycle,
        packageName,
        amount
      );

      console.log('✅ First billing record created');

      return { ok: true, subscription };
    } catch (error) {
      console.error('❌ Error creating subscription:', error);
      return { ok: false, error: error.message || 'Failed to create subscription' };
    }
  }

  /**
   * Get subscription by enterprise ID
   */
  async getEnterpriseSubscription(enterpriseId) {
    if (!enterpriseId) {
      return { ok: false, error: 'Enterprise ID is required' };
    }

    try {
      const subscription = await this.store.getSubscriptionByEnterprise(enterpriseId);
      
      if (!subscription) {
        return { ok: false, error: 'Subscription not found' };
      }

      return { ok: true, subscription };
    } catch (error) {
      console.error('Error fetching subscription:', error);
      return { ok: false, error: error.message || 'Failed to fetch subscription' };
    }
  }

  /**
   * Update subscription (change package, pause, cancel)
   */
  async updateSubscription(subscriptionId, updates, userId) {
    if (!subscriptionId) {
      return { ok: false, error: 'Subscription ID is required' };
    }

    try {
      const subscription = await this.store.updateSubscription(
        subscriptionId,
        updates,
        userId
      );

      return { ok: true, subscription, message: 'Subscription updated successfully' };
    } catch (error) {
      console.error('Error updating subscription:', error);
      return { ok: false, error: error.message || 'Failed to update subscription' };
    }
  }

  /**
   * Pause subscription
   */
  async pauseSubscription(subscriptionId, userId) {
    return await this.updateSubscription(subscriptionId, { status: 'paused' }, userId);
  }

  /**
   * Resume subscription
   */
  async resumeSubscription(subscriptionId, userId) {
    return await this.updateSubscription(subscriptionId, { status: 'active' }, userId);
  }

  /**
   * Cancel subscription
   */
  async cancelSubscription(subscriptionId, userId) {
    return await this.updateSubscription(subscriptionId, { status: 'cancelled' }, userId);
  }

  /**
   * Get subscription metrics (MRR, ARR, active count)
   */
  async getMetrics() {
    try {
      const metrics = await this.store.getSubscriptionMetrics();
      return { ok: true, metrics };
    } catch (error) {
      console.error('Error fetching subscription metrics:', error);
      return { ok: false, error: error.message || 'Failed to fetch metrics' };
    }
  }

  /**
   * Renew subscriptions (called by cron job)
   */
  async renewSubscriptions() {
    try {
      const dueSubscriptions = await this.store.getDueSubscriptions();
      
      let renewedCount = 0;
      const errors = [];

      for (const subscription of dueSubscriptions) {
        try {
          // Calculate next period
          const nextPeriodStart = subscription.nextBillingDate;
          const nextPeriodEnd = this.store.calculatePeriodEnd(
            nextPeriodStart,
            subscription.billingCycle
          );
          const newNextBillingDate = this.store.calculateNextBillingDate(
            nextPeriodStart,
            subscription.billingCycle
          );

          // Create new billing record
          await this.store.createBillingRecord(
            subscription.id,
            subscription.enterpriseId,
            nextPeriodStart,
            nextPeriodEnd,
            subscription.billingCycle,
            subscription.packageName,
            subscription.amountPerCycle
          );

          // Update subscription for next cycle
          await this.store.updateSubscription(subscription.id, {
            currentPeriodStart: nextPeriodStart,
            currentPeriodEnd: nextPeriodEnd,
            nextBillingDate: newNextBillingDate
          });

          renewedCount++;
          console.log(`✅ Renewed subscription for enterprise: ${subscription.enterpriseId}`);
        } catch (error) {
          console.error(`❌ Failed to renew subscription ${subscription.id}:`, error);
          errors.push({ subscriptionId: subscription.id, error: error.message });
        }
      }

      return {
        ok: true,
        message: `Renewed ${renewedCount} subscriptions`,
        renewedCount,
        errors: errors.length > 0 ? errors : undefined
      };
    } catch (error) {
      console.error('Error renewing subscriptions:', error);
      return { ok: false, error: error.message || 'Failed to renew subscriptions' };
    }
  }
}

module.exports = SubscriptionService;
