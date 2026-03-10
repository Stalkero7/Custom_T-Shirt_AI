# Step 4: Checkout & Order Generation

## Overview

This final step integrates payment processing via Stripe and order submission to Printful. The complete workflow allows users to pay for their custom t-shirts and have them manufactured and shipped.

## Architecture

```
┌────────────────────────────────────────────────────────────┐
│                   Checkout Component                       │
│  ┌────────────────┬────────────────┬──────────────────┐   │
│  │ Customer Info  │ Shipping Addr  │ Product Selection│   │
│  └────────────────┴────────────────┴──────────────────┘   │
└────────────────────────────────────────────────────────────┘
                         ↓
                  Cost Calculation
                         ↓
┌────────────────────────────────────────────────────────────┐
│              Frontend (React Component)                    │
│                                                            │
│  POST /api/checkout                                        │
│  → Create Stripe Payment Intent                           │
│                                                            │
│  POST /api/confirm-payment                                │
│  → Verify Payment Success                                 │
│  → Submit Order to Printful                               │
│                                                            │
│  Response: Confirmation & Printful Order ID              │
└────────────────────────────────────────────────────────────┘
                         ↓
        ┌─────────────────────────────────┐
        │      Stripe Payment API         │
        │   (Secure Payment Processing)   │
        └─────────────────────────────────┘
                         ↓
        ┌─────────────────────────────────┐
        │      Printful API                │
        │  (Manufacturing & Shipping)     │
        └─────────────────────────────────┘
```

## Key Components

### checkout.js (Backend Service)

Core checkout and order management functions using Stripe & Printful APIs.

#### `createPaymentIntent(amount, metadata)`

Creates a Stripe Payment Intent for payment processing.

**Parameters**:
- `amount`: Amount in cents (e.g., 2999 for $29.99)
- `metadata`: Custom data (orderId, productName, etc.)

**Returns**:
```json
{
  "success": true,
  "clientSecret": "pi_xxx_secret_xxx",
  "paymentIntentId": "pi_xxx",
  "amount": 2999,
  "currency": "usd"
}
```

**Flow**:
1. User clicks "Continue to Payment"
2. Creates Stripe Payment Intent
3. Returns client secret for frontend payment confirmation
4. Frontend uses client secret to verify payment with Stripe.js

#### `submitToPrintful(orderData)`

Submits an order to Printful API for manufacturing.

**Parameters**:
```json
{
  "recipient": {
    "name": "John Doe",
    "email": "john@example.com",
    "phone": "555-1234"
  },
  "items": [
    {
      "productId": 3001,
      "variantId": 7959,
      "quantity": 1,
      "files": [
        {
          "type": "front",
          "url": "https://..."
        }
      ]
    }
  ],
  "shipping": "STANDARD",
  "address": {
    "name": "John Doe",
    "address1": "123 Main St",
    "city": "New York",
    "state_code": "NY",
    "country_code": "US",
    "zip": "10001"
  }
}
```

**Returns**:
```json
{
  "success": true,
  "printfulOrderId": 12345678,
  "orderData": {...}
}
```

**Printful Products** (examples):
- `3001` - Gildan T-Shirt
- Product list available via `/api/printful-products`

#### `confirmPaymentAndOrder(paymentIntentId, orderData)`

Verifies Stripe payment and submits to Printful.

**Flow**:
1. Retrieves payment intent from Stripe
2. Verifies payment status = "succeeded"
3. Submits order to Printful
4. Returns combined success response

**Response**:
```json
{
  "success": true,
  "payment": {
    "status": "succeeded",
    "paymentIntentId": "pi_xxx",
    "amount": 29.99,
    "currency": "usd"
  },
  "order": {
    "printfulOrderId": 12345678,
    "orderData": {...}
  }
}
```

#### `calculateOrderCost(items, shippingCountry)`

Calculates total order cost including shipping and tax.

**Parameters**:
- `items`: Array of products with quantity
- `shippingCountry`: Country code (default: 'US')

**Returns**:
```json
{
  "success": true,
  "subtotal": 12.00,
  "printingCost": 3.50,
  "shipping": 5.95,
  "tax": 2.05,
  "total": 23.50,
  "currency": "USD"
}
```

#### `getPrintfulProducts()`

Fetches available Printful products (t-shirts, hoodies, etc.).

#### `getPrintfulVariants(productId)`

Gets available variants (sizes, colors) for a product.

## API Endpoints

### POST /api/checkout

Creates a Stripe Payment Intent.

**Request**:
```json
{
  "amount": 29.99,
  "orderData": {
    "orderId": "1234567890",
    "items": [...],
    "recipient": {...},
    "shippingAddress": {...}
  }
}
```

**Response**:
```json
{
  "success": true,
  "clientSecret": "pi_xxx_secret_xxx",
  "paymentIntentId": "pi_xxx",
  "amount": 2999,
  "currency": "usd"
}
```

### POST /api/confirm-payment

Confirms payment and submits order to Printful.

**Request**:
```json
{
  "paymentIntentId": "pi_xxx",
  "orderData": {
    "recipient": {...},
    "items": [...],
    "shippingAddress": {...}
  }
}
```

**Response**:
```json
{
  "success": true,
  "payment": {...},
  "order": {...}
}
```

### GET /api/printful-products

Fetches available products.

**Response**:
```json
{
  "success": true,
  "products": [
    {
      "id": 3001,
      "title": "Gildan T-Shirt",
      "type": "tee",
      "variants": [...]
    }
  ],
  "total": 15
}
```

### GET /api/printful-variants/:productId

Fetches variants for a product.

**Example**: `GET /api/printful-variants/3001`

### POST /api/calculate-cost

Calculates order cost.

**Request**:
```json
{
  "items": [
    {
      "productId": 3001,
      "variantId": 7959,
      "quantity": 1
    }
  ],
  "shippingCountry": "US"
}
```

## React Checkout Component

### Features

1. **Three-Step Workflow**:
   - Step 1: Customer & Shipping Details
   - Step 2: Payment Processing
   - Step 3: Order Confirmation

2. **Order Summary**:
   - Subtotal calculation
   - Shipping costs
   - Tax estimation
   - Total price

3. **Form Validation**:
   - Required field checks
   - Error messaging
   - Real-time cost updates

### Usage in TShirtEditor

```jsx
import Checkout from './components/Checkout';

<Checkout 
  canvasState={getCanvasState()} 
  selectedColor={selectedColor} 
/>
```

### Component Props

- `canvasState`: Canvas design data (from exportCanvasDesign)
- `selectedColor`: Currently selected t-shirt color

### State Management

```javascript
// Checkout steps
'cost-calculation' → 'payment' → 'confirmation'

// Customer info captured
firstName, lastName, email, phone

// Shipping address
address1, address2, city, state, zip, country

// Product selection
productId, variantId, quantity
```

## Environment Variables Required

Add to `.env`:

```
# Stripe
STRIPE_SECRET_KEY=sk_live_xxxxxxxxxxxxxx
STRIPE_PUBLIC_KEY=pk_live_xxxxxxxxxxxxxx

# Printful
PRINTFUL_API_KEY=your_printful_api_key_here
```

**How to Get Keys**:

1. **Stripe**: https://dashboard.stripe.com/apikeys
   - Create test/live key pair
   - Use test keys for development

2. **Printful**: https://www.printful.com/dashboard/integration
   - Generate API key
   - Available in Account Settings

## Complete Purchase Flow

### Step 1: Order Details
```
User fills in:
├── First Name & Last Name
├── Email & Phone
├── Shipping Address
└── Product Quantity
```

### Step 2: Cost Calculation
```
Calculate:
├── Subtotal (product cost × quantity)
├── Printing Cost (per item)
├── Shipping (based on country)
├── Tax (estimated 8%)
└── Total
```

### Step 3: Payment
```
User clicks "Continue to Payment"
↓
Create Stripe Payment Intent
↓
Frontend confirms payment with Stripe.js
↓
Payment processes (simulated in demo)
```

### Step 4: Order Submission
```
Verify payment succeeded
↓
Format Printful order:
├── Design image
├── Product variant
├── Customer info
├── Shipping address
└── Quantity
↓
Submit to Printful API
↓
Receive Printful Order ID
```

### Step 5: Confirmation
```
Display confirmation page:
├── Order summary
├── Printful Order ID
├── Shipping address
└── Next steps (email, tracking, etc.)
```

## Implementation Notes

### Payment Processing (Simplified)

The current implementation simulates payment success. In production:

```javascript
// Frontend would use Stripe.js
import { loadStripe } from '@stripe/js';

const stripe = await loadStripe(STRIPE_PUBLIC_KEY);
const { paymentMethod } = await stripe.confirmCardPayment(
  clientSecret,
  { payment_method: cardElement }
);
```

### Image Upload to Printful

Designimage must be publicly accessible URL:
```
// Works:
- https://example.com/design.png
- Data URLs (if backend serves them)

// Doesn't work:
- Local file paths
- Private URLs
```

### Printful Statuses
- `draft` - Order created but unpaid
- `pending` - Payment received, preparing to print
- `production` - Printing in progress
- `in_transit` - Shipped
- `delivered` - Delivered

## Error Handling

### Common Issues

**"Invalid Stripe API Key"**
- Check STRIPE_SECRET_KEY in .env
- Ensure it's a secret key (starts with `sk_`)

**"PRINTFUL_API_KEY not configured"**
- Add PRINTFUL_API_KEY to .env
- Get from Printful dashboard

**"Payment failed"**
- Check Stripe payment intent status
- Verify amount in cents (2999 = $29.99)

**"Order submission failed"**
- Verify shipping address completeness
- Check design image URL accessibility
- Ensure Printful product/variant IDs are valid

## Testing

### Manual Testing Checklist

1. **Order Calculator**
   - [ ] Add item to cart
   - [ ] Change quantity
   - [ ] Cost updates correctly
   - [ ] Tax calculation is accurate

2. **Customer Info**
   - [ ] All fields required except address2/phone
   - [ ] Email validation works
   - [ ] Form validation prevents submission

3. **Payment** 
   - [ ] Payment intent created
   - [ ] Client secret generated
   - [ ] Payment confirmed successfully

4. **Order Submission**
   - [ ] Order sent to Printful
   - [ ] Printful Order ID received
   - [ ] Confirmation displayed

### Test Stripe Cards

(For test mode only):
- Visa: `4242 4242 4242 4242`
- Visa (declined): `4000000000000002`
- CVC: any 3 digits
- Date: any future date

## File Structure

```
src/
├── components/
│   ├── TShirtEditor.jsx
│   ├── ImageUploader.jsx
│   ├── PromptInput.jsx
│   └── Checkout.jsx             ← NEW
└── styles/
    └── Checkout.css             ← NEW

server/
├── index.js                      # Updated with checkout routes
├── imageProcessor.js
└── checkout.js                   ← NEW
```

## Dependencies

Already installed:
- `stripe` - Payment processing
- `axios` - API calls
- `express` - Server framework
- `cors` - Cross-origin requests

## Production Considerations

1. **Security**
   - Store API keys in secure environment
   - HTTPS only in production
   - Validate all input on backend
   - Never expose secret keys to frontend

2. **Payment**
   - Use Stripe webhooks for order confirmation
   - Store order records in database
   - Implement refund handling

3. **Printful Integration**
   - Monitor order status via Printful webhooks
   - Handle order errors gracefully
   - Store printful_order_id for tracking

4. **Scaling**
   - Cache Printful product list
   - Queue order submissions for reliability
   - Implement rate limiting

## Next Steps

For production deployment:

1. Set up Stripe account and add live keys
2. Set up Printful integration
3. Implement database for order history
4. Add webhook handlers for payment/order updates
5. Set up email notifications
6. Implement order tracking dashboard
7. Add return/refund handling
8. Set up monitoring and error tracking

## Example Complete Workflow

```javascript
// 1. User fills checkout form
// 2. Click "Continue to Payment"

const response = await axios.post('/api/checkout', {
  amount: 29.99,
  orderData: orderData
});

// 3. Simulate payment success
await new Promise(resolve => setTimeout(resolve, 2000));

// 4. Confirm and submit to Printful
const confirmation = await axios.post('/api/confirm-payment', {
  paymentIntentId: response.data.paymentIntentId,
  orderData: orderData
});

// 5. Display confirmation with Printful Order ID
console.log('Printful Order ID:', confirmation.data.order.printfulOrderId);
```

## Support Resources

- Stripe API: https://stripe.com/docs/api
- Printful API: https://developers.printful.com/
- React Stripe.js: https://stripe.com/docs/stripe-js/react
- Testing: https://stripe.com/docs/testing

---

**Congratulations!** You've completed all 4 major steps of the AI T-Shirt Store application:

✅ Step 1: Interactive Canvas Module
✅ Step 2: Image Injection & Upload
✅ Step 3: Backend Image Processing
✅ Step 4: Checkout & Order Generation

The application is now ready for further refinement and production deployment!
