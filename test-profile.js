const API_BASE = 'http://127.0.0.1:8081';

async function testProfile() {
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
    return;
  }

  const loginData = await loginRes.json();
  console.log('✅ Login successful!');
  const token = loginData.token;

  // Test 1: Get Profile
  console.log('\n📋 Test 1: Get Profile');
  const getRes = await fetch(`${API_BASE}/api/v1/profile`, {
    headers: { 'Authorization': `Bearer ${token}` }
  });
  
  if (getRes.ok) {
    const data = await getRes.json();
    console.log('✅ Get profile successful');
    console.log('Profile:', {
      id: data.profile.id.substring(0, 8) + '...',
      email: data.profile.email,
      displayName: data.profile.displayName,
      role: data.profile.role
    });
  } else {
    console.error('❌ Get profile failed:', getRes.status, await getRes.text());
  }

  // Test 2: Update Display Name
  console.log('\n✏️  Test 2: Update Display Name');
  const updateNameRes = await fetch(`${API_BASE}/api/v1/profile`, {
    method: 'PUT',
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      displayName: 'Super Admin Updated'
    })
  });

  if (updateNameRes.ok) {
    const data = await updateNameRes.json();
    console.log('✅ Update display name successful');
    console.log('New name:', data.profile.displayName);
  } else {
    console.error('❌ Update display name failed:', await updateNameRes.text());
  }

  // Test 3: Revert Display Name
  console.log('\n🔄 Test 3: Revert Display Name');
  const revertNameRes = await fetch(`${API_BASE}/api/v1/profile`, {
    method: 'PUT',
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      displayName: 'Super Admin'
    })
  });

  if (revertNameRes.ok) {
    const data = await revertNameRes.json();
    console.log('✅ Revert display name successful');
    console.log('Name:', data.profile.displayName);
  } else {
    console.error('❌ Revert display name failed');
  }

  // Test 4: Try duplicate email (should fail)
  console.log('\n❌ Test 4: Try Duplicate Email (should fail)');
  const dupEmailRes = await fetch(`${API_BASE}/api/v1/profile`, {
    method: 'PUT',
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      email: 'jay@gmail.com' // Assuming this exists
    })
  });

  if (!dupEmailRes.ok) {
    const error = await dupEmailRes.json();
    console.log('✅ Duplicate email correctly rejected:', error.error);
  } else {
    console.error('❌ Duplicate email should have been rejected!');
  }

  // Test 5: Change Password with wrong current password (should fail)
  console.log('\n❌ Test 5: Wrong Current Password (should fail)');
  const wrongPassRes = await fetch(`${API_BASE}/api/v1/profile/password`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      currentPassword: 'wrongpassword',
      newPassword: 'newpassword123'
    })
  });

  if (!wrongPassRes.ok) {
    const error = await wrongPassRes.json();
    console.log('✅ Wrong password correctly rejected:', error.error);
  } else {
    console.error('❌ Wrong password should have been rejected!');
  }

  // Test 6: Change Password with weak password (should fail)
  console.log('\n❌ Test 6: Weak Password (should fail)');
  const weakPassRes = await fetch(`${API_BASE}/api/v1/profile/password`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      currentPassword: 'admin123',
      newPassword: 'weak'
    })
  });

  if (!weakPassRes.ok) {
    const error = await weakPassRes.json();
    console.log('✅ Weak password correctly rejected:', error.error);
  } else {
    console.error('❌ Weak password should have been rejected!');
  }

  // Test 7: Change Password Successfully
  console.log('\n🔒 Test 7: Change Password Successfully');
  const changePassRes = await fetch(`${API_BASE}/api/v1/profile/password`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      currentPassword: 'admin123',
      newPassword: 'admin123new'
    })
  });

  if (changePassRes.ok) {
    const data = await changePassRes.json();
    console.log('✅ Password changed successfully:', data.message);

    // Test 8: Verify new password works
    console.log('\n🔐 Test 8: Verify New Password');
    const newLoginRes = await fetch(`${API_BASE}/api/v1/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: 'admin@kael.com',
        password: 'admin123new'
      })
    });

    if (newLoginRes.ok) {
      console.log('✅ New password works!');

      // Revert password back to original
      console.log('\n🔄 Reverting password back to original...');
      const newToken = (await newLoginRes.json()).token;
      
      const revertPassRes = await fetch(`${API_BASE}/api/v1/profile/password`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${newToken}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          currentPassword: 'admin123new',
          newPassword: 'admin123'
        })
      });

      if (revertPassRes.ok) {
        console.log('✅ Password reverted to original');
      }
    } else {
      console.error('❌ New password does not work!');
    }
  } else {
    console.error('❌ Password change failed:', await changePassRes.text());
  }

  console.log('\n✅ All profile tests completed!');
}

testProfile().catch(console.error);
