/**
 * Quick script to verify your environment variables are set correctly
 * Run this locally to check your .env file before deploying
 */

const requiredVars = [
  'VITE_SUPABASE_URL',
  'VITE_SUPABASE_ANON_KEY'
];

console.log('🔍 Checking environment variables...\n');

let allPresent = true;

requiredVars.forEach(varName => {
  const value = process.env[varName];
  if (value) {
    // Mask sensitive values
    const displayValue = varName.includes('KEY') 
      ? `${value.substring(0, 20)}...` 
      : value;
    console.log(`✅ ${varName}: ${displayValue}`);
  } else {
    console.log(`❌ ${varName}: MISSING`);
    allPresent = false;
  }
});

console.log('\n');

if (allPresent) {
  console.log('✅ All required environment variables are set!');
  console.log('You can now deploy to Vercel.');
} else {
  console.log('❌ Some environment variables are missing.');
  console.log('Please add them to your .env.local file or Vercel dashboard.');
  console.log('\nSee VERCEL_SETUP.md for instructions.');
  process.exit(1);
}

