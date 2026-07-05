async function testUsersAPI() {
  try {
    // First, login to get a valid token
    console.log('🔐 Logging in...');
    const loginResponse = await fetch('http://127.0.0.1:8081/api/v1/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: 'admin@kael.com',
        password: 'admin123'
      })
    });

    const loginData = await loginResponse.json();
    console.log('Login response:', loginData);
    if (!loginData.token) {
      console.error('❌ Login failed:', loginData.error || loginData);
      return;
    }

    console.log('✅ Login successful!');
    const token = loginData.token;

    // Now test the users endpoint
    console.log('\n👥 Fetching users...');
    const usersResponse = await fetch('http://127.0.0.1:8081/api/v1/users', {
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      }
    });

    const usersData = await usersResponse.json();
    
    if (!usersData.success) {
      console.error('❌ Users endpoint failed:', usersData.error);
      console.error('Status:', usersResponse.status);
      return;
    }

    console.log('✅ Users endpoint successful!');
    console.log('Users:', JSON.stringify(usersData.data, null, 2));

  } catch (error) {
    console.error('❌ Error:', error.message);
    console.error(error);
  }
}

testUsersAPI();
