const API_BASE = 'http://127.0.0.1:8081';

async function testEnterprises() {
  console.log('🔐 Logging in...');
  
  // Login
  const loginRes = await fetch(`${API_BASE}/api/v1/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      email: 'admin@kael.com',
      password: 'admin123'
    })
  });

  if (!loginRes.ok) {
    console.error('❌ Login failed:', loginRes.status);
    const text = await loginRes.text();
    console.error(text);
    return;
  }

  const loginData = await loginRes.json();
  console.log('✅ Login successful!');
  console.log('Token:', loginData.token.substring(0, 50) + '...\n');

  const token = loginData.token;

  // Fetch enterprises
  console.log('🏢 Fetching enterprises...');
  const entRes = await fetch(`${API_BASE}/api/v1/enterprises`, {
    headers: {
      'Authorization': `Bearer ${token}`
    }
  });

  console.log('Response status:', entRes.status);
  console.log('Response headers:', Object.fromEntries(entRes.headers.entries()));

  if (!entRes.ok) {
    console.error('❌ Enterprises fetch failed:', entRes.status);
    const text = await entRes.text();
    console.error('Response:', text);
    return;
  }

  const entData = await entRes.json();
  console.log('✅ Enterprises endpoint successful!');
  console.log('\nResponse structure:', {
    ok: entData.ok,
    enterprisesCount: entData.enterprises?.length || 0
  });
  console.log('\nEnterprises:', JSON.stringify(entData.enterprises, null, 2));
}

testEnterprises().catch(console.error);
