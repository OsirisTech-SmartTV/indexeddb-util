// Test script for demo functionality
// This script can be run in browser console to test the IndexedDB utility

// Load the library first
const script = document.createElement('script');
script.src = './dist/index.js';
script.onload = async function() {
    console.log('✅ IndexedDB Utility loaded successfully!');
    
    // Test basic functionality
    try {
        // Check compatibility
        const supported = DB.isIndexedDBSupported();
        console.log('IndexedDB supported:', supported);
        
        if (!supported) {
            console.error('❌ IndexedDB not supported in this browser');
            return;
        }
        
        // Get browser compatibility info
        const compatibility = DB.getBrowserCompatibility();
        console.log('Browser compatibility:', compatibility);
        
        // Create database configuration
        const dbConfig = {
            name: 'TestDB',
            version: 1,
            stores: [
                {
                    name: 'users',
                    config: { keyPath: 'id', autoIncrement: true },
                    indices: [
                        { name: 'email', keyPath: 'email', options: { unique: true } },
                        { name: 'age', keyPath: 'age' }
                    ]
                }
            ]
        };
        
        // Initialize database
        console.log('🔄 Initializing database...');
        const dbUtil = new DB.IndexedDBUtil(dbConfig);
        await dbUtil.init();
        console.log('✅ Database initialized successfully!');
        
        // Test CRUD operations
        console.log('🔄 Testing CRUD operations...');
        
        // Create
        const userData = {
            name: 'Test User',
            email: 'test@example.com',
            age: 25
        };
        
        const userId = await dbUtil.add('users', userData);
        console.log('✅ User added with ID:', userId);
        
        // Read
        const users = await dbUtil.getAll('users');
        console.log('✅ Users retrieved:', users);
        
        // Update
        const updatedUser = { ...users[0], age: 26 };
        await dbUtil.put('users', updatedUser);
        console.log('✅ User updated');
        
        // Delete
        const [deletedUser] = await dbUtil.delete('users', userId);
        console.log('✅ User deleted:', deletedUser.name);
        
        // Count
        const count = await dbUtil.count('users');
        console.log('✅ Remaining users count:', count);
        
        console.log('🎉 All tests completed successfully!');
        
    } catch (error) {
        console.error('❌ Test failed:', error.message);
    }
};

document.head.appendChild(script);