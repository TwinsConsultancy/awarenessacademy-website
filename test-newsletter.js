/**
 * Newsletter Test Script
 * Quick test to verify newsletter subscription endpoint is working
 */

const fetch = require('node-fetch');

const API_BASE = 'http://localhost:5001/api';

async function testNewsletterSubscription() {
    try {
        console.log('Testing newsletter subscription endpoint...');
        
        // Test with a valid email
        const testEmail = `test-${Date.now()}@example.com`;
        
        const response = await fetch(`${API_BASE}/subscribers/newsletter`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({ email: testEmail })
        });

        const data = await response.json();

        if (response.ok) {
            console.log('✅ Newsletter subscription successful!');
            console.log('Response:', data);
        } else {
            console.log('❌ Newsletter subscription failed');
            console.log('Error:', data);
        }

        // Test duplicate subscription
        console.log('\nTesting duplicate subscription...');
        const duplicateResponse = await fetch(`${API_BASE}/subscribers/newsletter`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({ email: testEmail })
        });

        const duplicateData = await duplicateResponse.json();
        console.log('Duplicate response:', duplicateData);

        // Test invalid email
        console.log('\nTesting invalid email...');
        const invalidResponse = await fetch(`${API_BASE}/subscribers/newsletter`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({ email: 'invalid-email' })
        });

        const invalidData = await invalidResponse.json();
        console.log('Invalid email response:', invalidData);

    } catch (error) {
        console.error('Test failed with error:', error.message);
        console.log('Make sure the server is running on port 5001');
    }
}

// Run the test
testNewsletterSubscription();