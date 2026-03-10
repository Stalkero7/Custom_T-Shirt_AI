import fs from 'fs';
import path from 'path';
import dotenv from 'dotenv';
import { fileURLToPath } from 'url';

dotenv.config();

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ORDERS_DIR = path.join(__dirname, '../orders');

// Ensure orders directory exists
if (!fs.existsSync(ORDERS_DIR)) {
  fs.mkdirSync(ORDERS_DIR, { recursive: true });
}

// Mock Stripe - will be replaced with real Stripe or WebPay later
let stripe = null;
try {
  if (process.env.STRIPE_SECRET_KEY) {
    const Stripe = (await import('stripe')).default;
    stripe = new Stripe(process.env.STRIPE_SECRET_KEY);
  }
} catch (err) {
  console.warn('⚠️  Stripe not available - using mock implementation');
}

/**
 * Creates a Stripe Payment Intent (or mock payment)
 * @param {number} amount - Amount in cents (e.g., 2999 for $29.99)
 * @param {object} metadata - Additional order metadata
 * @returns {Promise<object>} Payment Intent object with client secret
 */
export const createPaymentIntent = async (amount, metadata = {}) => {
  try {
    // Real Stripe implementation if key present
    if (stripe && process.env.STRIPE_SECRET_KEY) {
      const paymentIntent = await stripe.paymentIntents.create({
        amount: Math.round(amount), // Amount in cents
        currency: 'usd',
        metadata,
        automatic_payment_methods: {
          enabled: true,
        },
      });

      return {
        success: true,
        clientSecret: paymentIntent.client_secret,
        paymentIntentId: paymentIntent.id,
        amount: paymentIntent.amount,
        currency: paymentIntent.currency,
      };
    }

    // Mock payment if no Stripe key
    console.log('ℹ️  Using mock payment (no STRIPE_SECRET_KEY configured)');
    const mockPaymentId = `mock_pi_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    const mockClientSecret = `mock_secret_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

    return {
      success: true,
      clientSecret: mockClientSecret,
      paymentIntentId: mockPaymentId,
      amount: Math.round(amount),
      currency: 'usd',
      mock: true,
    };
  } catch (error) {
    console.error('Error creating payment intent:', error);
    throw new Error(`Failed to create payment intent: ${error.message}`);
  }
};

/**
 * Saves order locally for manual fulfillment
 * @param {object} orderData - Order details (customer info, design, etc.)
 * @returns {Promise<object>} Order confirmation
 */
export const saveOrder = async (orderData) => {
  try {
    const orderId = `ORD-${Date.now()}`;
    const orderPath = path.join(ORDERS_DIR, `${orderId}.json`);

    const completeOrder = {
      orderId,
      timestamp: new Date().toISOString(),
      status: 'pending_fulfillment',
      ...orderData,
    };

    // Save order to file
    fs.writeFileSync(orderPath, JSON.stringify(completeOrder, null, 2));
    console.log(`✅ Order saved: ${orderId}`);

    return {
      success: true,
      orderId,
      message: 'Order saved for manual printing and fulfillment',
      timestamp: completeOrder.timestamp,
    };
  } catch (error) {
    console.error('Error saving order:', error);
    throw new Error(`Failed to save order: ${error.message}`);
  }
};

/**
 * Gets all orders (useful for dashboard)
 * @returns {Promise<array>} All orders
 */
export const getOrders = async () => {
  try {
    const files = fs.readdirSync(ORDERS_DIR).filter(f => f.endsWith('.json'));
    const orders = files.map(file => {
      const content = fs.readFileSync(path.join(ORDERS_DIR, file), 'utf-8');
      return JSON.parse(content);
    });

    return {
      success: true,
      orders: orders.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp)),
      total: orders.length,
    };
  } catch (error) {
    console.error('Error reading orders:', error);
    throw new Error(`Failed to read orders: ${error.message}`);
  }
};



/**
 * Confirms payment and saves order for fulfillment
 * @param {string} paymentIntentId - Stripe payment intent ID (or mock)
 * @param {object} orderData - Order data (customer info, items, design, etc.)
 * @returns {Promise<object>} Combined payment and order confirmation
 */
export const confirmPaymentAndOrder = async (paymentIntentId, orderData) => {
  try {
    let paymentStatus = 'succeeded';
    let isRealPayment = false;

    // Real Stripe payment verification if using real Stripe
    if (stripe && process.env.STRIPE_SECRET_KEY && !paymentIntentId.startsWith('mock_')) {
      const paymentIntent = await stripe.paymentIntents.retrieve(paymentIntentId);
      paymentStatus = paymentIntent.status;
      isRealPayment = true;

      if (paymentIntent.status !== 'succeeded') {
        throw new Error(`Payment not successful. Status: ${paymentIntent.status}`);
      }
    }

    // Save order for manual fulfillment
    const orderResult = await saveOrder(orderData);

    return {
      success: true,
      payment: {
        status: paymentStatus,
        paymentIntentId,
        amount: orderData.total,
        currency: orderData.currency || 'USD',
        real: isRealPayment,
      },
      order: orderResult,
      message: '✅ Payment successful! We\'ll start printing your shirt soon.',
      timestamp: new Date().toISOString(),
    };
  } catch (error) {
    console.error('Error confirming payment and order:', error);
    throw error;
  }
};



/**
 * Calculates order cost based on simple fixed pricing
 * @param {array} items - Array of items (each represents a shirt quantity)
 * @param {string} shippingCountry - Country code for shipping
 * @returns {object} Cost breakdown
 */
export const calculateOrderCost = (items, shippingCountry = 'CL') => {
  try {
    // Fixed costs for your side hustle
    const SHIRT_COST = 15.0; // Base cost per shirt
    const DESIGN_COST = 5.0; // Design work per shirt
    
    let subtotal = 0;
    let designFee = 0;

    // Calculate per item
    items.forEach((item) => {
      const qty = item.quantity || 1;
      subtotal += SHIRT_COST * qty;
      designFee += DESIGN_COST * qty;
    });

    // Shipping to Chile is typically high
    const shippingCost = shippingCountry === 'CL' ? 5.0 : 10.0;
    
    // No tax calculation - you can add this later if needed
    const total = subtotal + designFee + shippingCost;

    return {
      success: true,
      subtotal: parseFloat(subtotal.toFixed(2)),
      designFee: parseFloat(designFee.toFixed(2)),
      shipping: parseFloat(shippingCost.toFixed(2)),
      total: parseFloat(total.toFixed(2)),
      currency: 'USD',
    };
  } catch (error) {
    console.error('Error calculating cost:', error);
    throw new Error(`Failed to calculate cost: ${error.message}`);
  }
};
