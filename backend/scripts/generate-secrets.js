#!/usr/bin/env node

/**
 * Generate Production Secrets
 * 
 * This script generates cryptographically secure values for production deployment.
 * Run this once and save the output securely in your production environment.
 * 
 * Usage: node scripts/generate-secrets.js
 */

const crypto = require('crypto');

console.log('\n' + '='.repeat(70));
console.log('🔐 HMS Production Secrets Generator');
console.log('='.repeat(70) + '\n');

// Generate JWT Secret (256-bit, 32 bytes in hex)
const jwtSecret = crypto.randomBytes(32).toString('hex');
console.log('1️⃣  JWT_SECRET (for authentication tokens)');
console.log('   ' + '─'.repeat(66));
console.log(`   JWT_SECRET=${jwtSecret}`);
console.log('   ✓ This is a 256-bit random value for signing JWT tokens\n');

// Generate Admin Fix Key (UUID format for easier handling)
const adminKey = crypto.randomUUID();
console.log('2️⃣  ADMIN_FIX_KEY (for first-time admin setup)');
console.log('   ' + '─'.repeat(66));
console.log(`   ADMIN_FIX_KEY=${adminKey}`);
console.log('   ✓ Use this ONLY for initial admin user creation');
console.log('   ✓ After setup, disable /api/auth/create-admin endpoint\n');

// Generate MongoDB encryption key (optional, for future use)
const mongoKey = crypto.randomBytes(32).toString('hex');
console.log('3️⃣  MONGODB_ENCRYPTION_KEY (optional, for future encryption)');
console.log('   ' + '─'.repeat(66));
console.log(`   MONGODB_ENCRYPTION_KEY=${mongoKey}`);
console.log('   ✓ Reserve this for future database encryption\n');

console.log('='.repeat(70));
console.log('📋 ENVIRONMENT VARIABLES TO SET');
console.log('='.repeat(70) + '\n');

console.log('Required in production .env file:');
console.log(`
JWT_SECRET=${jwtSecret}
ADMIN_FIX_KEY=${adminKey}
NODE_ENV=production
CORS_ORIGINS=https://yourdomain.com,https://app.yourdomain.com
MONGODB_URI=mongodb+srv://username:password@cluster.mongodb.net/hospital_db
PORT=3002
`);

console.log('Optional (only if using Paystack):');
console.log(`
PAYSTACK_SECRET_KEY=sk_live_xxxxxxxxxxxxx
`);

console.log('='.repeat(70));
console.log('🔒 SECURITY INSTRUCTIONS');
console.log('='.repeat(70) + '\n');

console.log('✅ DO:');
console.log('   • Copy these values to your secure secrets manager');
console.log('   • Use them in production environment variables');
console.log('   • Store safely (AWS Secrets Manager, Vault, etc.)');
console.log('   • Keep separate from code and version control\n');

console.log('❌ DON\'T:');
console.log('   • Commit these values to git');
console.log('   • Share with unauthorized team members');
console.log('   • Use the same values across multiple environments');
console.log('   • Log or display these values in production\n');

console.log('='.repeat(70));
console.log('📝 SETUP STEPS');
console.log('='.repeat(70) + '\n');

console.log('1. Set all environment variables in your hosting platform:');
console.log('   • Vercel: Settings → Environment Variables');
console.log('   • AWS: Secrets Manager or Parameter Store');
console.log('   • Docker: Pass as environment variables');
console.log('   • Local: Create .env file (add to .gitignore)\n');

console.log('2. After deployment, use admin setup endpoint:');
console.log('   POST /api/auth/create-admin');
console.log('   Header: x-fix-key: ' + adminKey);
console.log('   Body: { "username": "admin", "password": "secure_pwd", "fullName": "Admin" }\n');

console.log('3. After creating admin user:');
console.log('   • Remove or disable the /api/auth/create-admin endpoint');
console.log('   • Never reuse ADMIN_FIX_KEY across deployments\n');

console.log('='.repeat(70) + '\n');

// Option to save to file
const fs = require('fs');
const path = require('path');
const envExamplePath = path.join(__dirname, '..', '.env.production.example');

const envContent = `# Production Environment Variables
# Generated: ${new Date().toISOString()}
# ⚠️ SECURITY: These values should be kept secure and never committed

# Authentication
JWT_SECRET=${jwtSecret}
ADMIN_FIX_KEY=${adminKey}

# Database
MONGODB_URI=mongodb+srv://username:password@cluster.mongodb.net/hospital_db?retryWrites=true&w=majority

# Environment
NODE_ENV=production
PORT=3002

# CORS
CORS_ORIGINS=https://yourdomain.com,https://app.yourdomain.com

# Optional: Paystack Integration
# PAYSTACK_SECRET_KEY=sk_live_xxxxxxxxxxxxx

# Optional: Error Tracking
# SENTRY_DSN=https://xxxxx@sentry.io/xxxxx
`;

console.log('💾 Saving example file to .env.production.example...');
try {
  fs.writeFileSync(envExamplePath, envContent);
  console.log('   ✓ File saved\n');
} catch (err) {
  console.log('   ⚠️ Could not save file (optional): ' + err.message + '\n');
}

console.log('✨ Secrets generated successfully!\n');
