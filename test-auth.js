import payload from 'payload';
import { getPayload } from 'payload';
import dotenv from 'dotenv';
import path from 'path';

// Load environment variables
dotenv.config({
  path: path.resolve(process.cwd(), '.env.local')
});

async function testAuth() {
  try {
    console.log('Initializing Payload...');
    
    // Initialize Payload
    const payloadInstance = await getPayload({
      configPath: path.resolve(process.cwd(), 'src/payload.config.ts'),
    });

    console.log('Payload initialized successfully!');
    
    // Test creating first user
    console.log('\nTesting user creation...');
    
    try {
      const user = await payloadInstance.create({
        collection: 'users',
        data: {
          email: 'admin@example.com',
          password: 'Admin123!',
        },
      });
      
      console.log('User created successfully:', user.email);
    } catch (error) {
      console.error('Error creating user:', error.message);
    }
    
    // Test login
    console.log('\nTesting login...');
    
    try {
      const loginResult = await payloadInstance.login({
        collection: 'users',
        data: {
          email: 'admin@example.com',
          password: 'Admin123!',
        },
      });
      
      console.log('Login successful!');
      console.log('User:', loginResult.user.email);
    } catch (error) {
      console.error('Error logging in:', error.message);
    }
    
    process.exit(0);
  } catch (error) {
    console.error('Test failed:', error);
    process.exit(1);
  }
}

testAuth();