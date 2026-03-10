import React, { useState, useEffect } from 'react';
import axios from 'axios';
import '../styles/Checkout.css';

const Checkout = ({ canvasState, selectedColor }) => {
  const [step, setStep] = useState('cost-calculation'); // cost-calculation -> payment -> confirmation
  const [costData, setCostData] = useState(null);
  const [customerInfo, setCustomerInfo] = useState({
    firstName: '',
    lastName: '',
    email: '',
    phone: '',
  });
  // Use backend API URL from environment or default to localhost:5000
  const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000';
  const [shippingAddress, setShippingAddress] = useState({
    address1: '',
    address2: '',
    city: '',
    state: '',
    zip: '',
    country: 'US',
  });
  const [productSelection, setProductSelection] = useState({
    productId: 3001, // Default t-shirt product
    variantId: 7959, // Default variant
    quantity: 1,
  });
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);
  const [paymentIntentId, setPaymentIntentId] = useState(null);
  const [orderConfirmation, setOrderConfirmation] = useState(null);

  // Calculate order cost on mount and when items change
  useEffect(() => {
    calculateCost();
  }, [productSelection]);

  const calculateCost = async () => {
    try {
      setIsLoading(true);
      setError(null);

      const items = [
        {
          productId: productSelection.productId,
          variantId: productSelection.variantId,
          quantity: productSelection.quantity,
          designUrl: canvasState?.dataUrl,
        },
      ];

      const response = await axios.post(`${API_URL}/api/calculate-cost`, {
        items,
        shippingCountry: shippingAddress.country || 'US',
      });

      setCostData(response.data);
    } catch (err) {
      console.error('Error calculating cost:', err);
      setError('Failed to calculate order cost');
    } finally {
      setIsLoading(false);
    }
  };

  const handlePayment = async () => {
    try {
      setIsLoading(true);
      setError(null);

      if (!customerInfo.firstName || !customerInfo.email) {
        throw new Error('Please fill in all required fields');
      }

      if (
        !shippingAddress.address1 ||
        !shippingAddress.city ||
        !shippingAddress.state ||
        !shippingAddress.zip
      ) {
        throw new Error('Please fill in all shipping address fields');
      }

      // Create payment intent
      const checkoutResponse = await axios.post(`${API_URL}/api/checkout`, {
        amount: costData.total,
        orderData: {
          orderId: Date.now().toString(),
          items: [
            {
              productId: productSelection.productId,
              variantId: productSelection.variantId,
              quantity: productSelection.quantity,
              designUrl: canvasState?.dataUrl,
              productName: `T-Shirt (${selectedColor})`,
            },
          ],
          recipient: {
            name: `${customerInfo.firstName} ${customerInfo.lastName}`,
            email: customerInfo.email,
            phone: customerInfo.phone,
          },
          shippingAddress: shippingAddress,
        },
      });

      setPaymentIntentId(checkoutResponse.data.paymentIntentId);
      setStep('payment');

      // In production, this would integrate with Stripe.js
      // For now, we'll simulate successful payment
      await simulatePaymentSuccess(checkoutResponse.data.paymentIntentId);
    } catch (err) {
      console.error('Error in payment:', err);
      setError(err.response?.data?.details || err.message);
    } finally {
      setIsLoading(false);
    }
  };

  const simulatePaymentSuccess = async (intentId) => {
    try {
      // Simulate payment completion
      setTimeout(async () => {
        await confirmPaymentAndSubmitOrder(intentId);
      }, 2000);
    } catch (err) {
      console.error('Error simulating payment:', err);
    }
  };

  const confirmPaymentAndSubmitOrder = async (intentId) => {
    try {
      setIsLoading(true);

      const orderData = {
        recipient: {
          name: `${customerInfo.firstName} ${customerInfo.lastName}`,
          email: customerInfo.email,
          phone: customerInfo.phone,
        },
        items: [
          {
            productId: productSelection.productId,
            variantId: productSelection.variantId,
            quantity: productSelection.quantity,
            designUrl: canvasState?.dataUrl,
          },
        ],
        shippingAddress: shippingAddress,
        notificationEmail: customerInfo.email,
      };

      const response = await axios.post(`${API_URL}/api/confirm-payment`, {
        paymentIntentId: intentId,
        orderData,
      });

      setOrderConfirmation(response.data);
      setStep('confirmation');
    } catch (err) {
      console.error('Error confirming payment:', err);
      setError(err.response?.data?.details || err.message);
      setStep('cost-calculation');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="checkout">
      <div className="checkout-header">
        <h2>Complete Your Order</h2>
        <div className="checkout-steps">
          <div className={`step ${step === 'cost-calculation' ? 'active' : ''}`}>
            1. Details
          </div>
          <div className={`step ${step === 'payment' ? 'active' : ''}`}>
            2. Payment
          </div>
          <div className={`step ${step === 'confirmation' ? 'active' : ''}`}>
            3. Confirmation
          </div>
        </div>
      </div>

      {error && <div className="error-message">{error}</div>}

      {step === 'cost-calculation' && (
        <div className="checkout-section">
          <div className="section-group">
            <h3>Product Selection</h3>
            <div className="form-group">
              <label>Quantity</label>
              <input
                type="number"
                min="1"
                max="100"
                value={productSelection.quantity}
                onChange={(e) =>
                  setProductSelection({
                    ...productSelection,
                    quantity: parseInt(e.target.value),
                  })
                }
              />
            </div>
          </div>

          <div className="section-group">
            <h3>Customer Information</h3>
            <div className="form-row">
              <div className="form-group">
                <label htmlFor="firstName">First Name *</label>
                <input
                  id="firstName"
                  type="text"
                  value={customerInfo.firstName}
                  onChange={(e) =>
                    setCustomerInfo({
                      ...customerInfo,
                      firstName: e.target.value,
                    })
                  }
                  required
                />
              </div>
              <div className="form-group">
                <label htmlFor="lastName">Last Name *</label>
                <input
                  id="lastName"
                  type="text"
                  value={customerInfo.lastName}
                  onChange={(e) =>
                    setCustomerInfo({
                      ...customerInfo,
                      lastName: e.target.value,
                    })
                  }
                  required
                />
              </div>
            </div>
            <div className="form-group">
              <label htmlFor="email">Email *</label>
              <input
                id="email"
                type="email"
                value={customerInfo.email}
                onChange={(e) =>
                  setCustomerInfo({ ...customerInfo, email: e.target.value })
                }
                required
              />
            </div>
            <div className="form-group">
              <label htmlFor="phone">Phone</label>
              <input
                id="phone"
                type="tel"
                value={customerInfo.phone}
                onChange={(e) =>
                  setCustomerInfo({ ...customerInfo, phone: e.target.value })
                }
              />
            </div>
          </div>

          <div className="section-group">
            <h3>Shipping Address</h3>
            <div className="form-group">
              <label htmlFor="address1">Address *</label>
              <input
                id="address1"
                type="text"
                value={shippingAddress.address1}
                onChange={(e) =>
                  setShippingAddress({
                    ...shippingAddress,
                    address1: e.target.value,
                  })
                }
                required
              />
            </div>
            <div className="form-group">
              <label htmlFor="address2">Address Line 2</label>
              <input
                id="address2"
                type="text"
                value={shippingAddress.address2}
                onChange={(e) =>
                  setShippingAddress({
                    ...shippingAddress,
                    address2: e.target.value,
                  })
                }
              />
            </div>
            <div className="form-row">
              <div className="form-group">
                <label htmlFor="city">City *</label>
                <input
                  id="city"
                  type="text"
                  value={shippingAddress.city}
                  onChange={(e) =>
                    setShippingAddress({
                      ...shippingAddress,
                      city: e.target.value,
                    })
                  }
                  required
                />
              </div>
              <div className="form-group">
                <label htmlFor="state">State/Province *</label>
                <input
                  id="state"
                  type="text"
                  value={shippingAddress.state}
                  onChange={(e) =>
                    setShippingAddress({
                      ...shippingAddress,
                      state: e.target.value,
                    })
                  }
                  required
                />
              </div>
            </div>
            <div className="form-row">
              <div className="form-group">
                <label htmlFor="zip">Zip/Postal Code *</label>
                <input
                  id="zip"
                  type="text"
                  value={shippingAddress.zip}
                  onChange={(e) =>
                    setShippingAddress({ ...shippingAddress, zip: e.target.value })
                  }
                  required
                />
              </div>
              <div className="form-group">
                <label htmlFor="country">Country *</label>
                <select
                  id="country"
                  value={shippingAddress.country}
                  onChange={(e) =>
                    setShippingAddress({
                      ...shippingAddress,
                      country: e.target.value,
                    })
                  }
                >
                  <option value="US">United States</option>
                  <option value="CA">Canada</option>
                  <option value="GB">United Kingdom</option>
                  <option value="AU">Australia</option>
                </select>
              </div>
            </div>
          </div>

          {costData && (
            <div className="cost-summary">
              <h3>Order Summary</h3>
              <div className="cost-row">
                <span>Subtotal:</span>
                <span>${costData.subtotal?.toFixed(2) || '0.00'}</span>
              </div>
              <div className="cost-row">
                <span>Printing:</span>
                <span>${costData.printingCost?.toFixed(2) || '0.00'}</span>
              </div>
              <div className="cost-row">
                <span>Shipping:</span>
                <span>${costData.shipping?.toFixed(2) || '0.00'}</span>
              </div>
              <div className="cost-row">
                <span>Tax:</span>
                <span>${costData.tax?.toFixed(2) || '0.00'}</span>
              </div>
              <div className="cost-row total">
                <span>Total:</span>
                <span>${costData.total?.toFixed(2) || '0.00'}</span>
              </div>
            </div>
          )}

          <div className="checkout-actions">
            <button
              className="continue-btn"
              onClick={handlePayment}
              disabled={isLoading}
            >
              {isLoading ? 'Processing...' : 'Continue to Payment'}
            </button>
          </div>
        </div>
      )}

      {step === 'payment' && (
        <div className="checkout-section">
          <div className="payment-processing">
            <div className="spinner"></div>
            <h3>Processing Payment...</h3>
            <p>Please wait while we process your payment and submit your order.</p>
          </div>
        </div>
      )}

      {step === 'confirmation' && orderConfirmation && (
        <div className="checkout-section">
          <div className="confirmation">
            <div className="success-icon">✓</div>
            <h3>Order Confirmed!</h3>
            <p className="confirmation-message">
              Thank you for your order! Your custom t-shirt has been submitted
              to our printing partner.
            </p>

            <div className="confirmation-details">
              <div className="detail-group">
                <h4>Order Information</h4>
                <p>
                  <strong>Printful Order ID:</strong>{' '}
                  {orderConfirmation.order?.printfulOrderId}
                </p>
                <p>
                  <strong>Total Paid:</strong> ${orderConfirmation.payment?.amount?.toFixed(2)}
                </p>
                <p>
                  <strong>Confirmation Email:</strong> {customerInfo.email}
                </p>
              </div>

              <div className="detail-group">
                <h4>Shipping To</h4>
                <p>
                  {shippingAddress.address1}
                  {shippingAddress.address2 && <>, {shippingAddress.address2}</>}
                </p>
                <p>
                  {shippingAddress.city}, {shippingAddress.state}{' '}
                  {shippingAddress.zip}
                </p>
                <p>{shippingAddress.country}</p>
              </div>

              <div className="detail-group">
                <h4>What's Next?</h4>
                <ul>
                  <li>You'll receive a confirmation email shortly</li>
                  <li>Your t-shirt will be printed and shipped within 5-7 business days</li>
                  <li>You'll receive tracking information via email</li>
                  <li>
                    Contact us if you have any questions about your order
                  </li>
                </ul>
              </div>
            </div>

            <div className="checkout-actions">
              <button className="new-design-btn" onClick={() => location.reload()}>
                Create Another Design
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Checkout;
