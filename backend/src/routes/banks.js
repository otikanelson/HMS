const express = require('express');
const { authenticateToken, requireAccessLevel } = require('../middleware/auth');

const router = express.Router();

// In-memory cache for bank list
let bankCache = {
  data: null,
  expiresAt: null
};

/**
 * Fetch Nigerian banks from Paystack
 */
async function fetchBanksFromPaystack() {
  const secretKey = process.env.PAYSTACK_SECRET_KEY;
  if (!secretKey) {
    throw new Error('Paystack not configured');
  }

  try {
    const response = await fetch('https://api.paystack.co/bank?country=nigeria&currency=NGN', {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${secretKey}`
      }
    });

    if (!response.ok) {
      throw new Error(`Paystack API error: ${response.status}`);
    }

    const data = await response.json();
    
    if (!data.status || !data.data) {
      throw new Error('Invalid Paystack response');
    }

    // Transform to {name, code} format
    return data.data.map(bank => ({
      name: bank.name,
      code: bank.code
    }));
  } catch (error) {
    console.error('Error fetching banks from Paystack:', error);
    throw error;
  }
}

// GET /api/banks - Get list of Nigerian banks (cached, 24-hour TTL)
router.get('/', authenticateToken, requireAccessLevel('ADMINISTRATOR'), async (req, res) => {
  try {
    const now = Date.now();

    // Check if cache is still valid
    if (bankCache.data && bankCache.expiresAt && now < bankCache.expiresAt) {
      return res.json(bankCache.data);
    }

    // Fetch fresh data
    const banks = await fetchBanksFromPaystack();

    // Update cache
    bankCache.data = banks;
    bankCache.expiresAt = now + (24 * 60 * 60 * 1000); // 24 hours

    res.json(banks);
  } catch (error) {
    console.error('GET /api/banks error:', error);
    
    // If no Paystack key or network error, respond with indication
    if (error.message === 'Paystack not configured') {
      return res.status(503).json({
        configured: false,
        error: 'Paystack is not set up yet'
      });
    }

    res.status(500).json({
      error: 'Failed to fetch banks'
    });
  }
});

// POST /api/banks/verify - Verify account number and get account name
router.post('/verify', authenticateToken, requireAccessLevel('ADMINISTRATOR'), async (req, res) => {
  try {
    const { accountNumber, bankCode } = req.body;

    if (!accountNumber || !bankCode) {
      return res.status(400).json({
        error: 'Account number and bank code are required'
      });
    }

    const secretKey = process.env.PAYSTACK_SECRET_KEY;
    if (!secretKey) {
      return res.status(503).json({
        configured: false,
        error: 'Paystack is not set up yet'
      });
    }

    // Call Paystack resolve endpoint
    const response = await fetch(
      `https://api.paystack.co/bank/resolve?account_number=${accountNumber}&bank_code=${bankCode}`,
      {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${secretKey}`
        }
      }
    );

    if (!response.ok) {
      // Account not found or invalid
      return res.status(400).json({
        error: 'We could not find that account. Check the number and bank.'
      });
    }

    const data = await response.json();

    if (!data.status || !data.data || !data.data.account_name) {
      return res.status(400).json({
        error: 'We could not find that account. Check the number and bank.'
      });
    }

    res.json({
      accountName: data.data.account_name
    });
  } catch (error) {
    console.error('POST /api/banks/verify error:', error);
    res.status(500).json({
      error: 'Verification failed'
    });
  }
});

module.exports = router;
