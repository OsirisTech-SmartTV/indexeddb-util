// Demo script for IndexedDB Utility - Chrome >= 53 compatible
// Using ES5 syntax for maximum compatibility

// Load the library from dist
(function() {
    'use strict';

    // Create a simple module loader for our demo
    function loadScript(src, callback) {
        var script = document.createElement('script');
        script.src = src;
        script.onload = callback;
        script.onerror = function() {
            console.error('Failed to load script:', src);
        };
        document.head.appendChild(script);
    }

    // Load the ES module build and make it available
    loadScript('./dist/index.js', function() {
        // The module should be available now
        console.log('IndexedDB Utility library loaded');
        
        // Initialize demo when library is ready
        if (typeof initDemo === 'function') {
            initDemo();
        }
    });

    // Global variables for demo
    window.dbUtil = null;
    
    // Database configuration
    window.dbConfig = {
        name: 'DemoApp',
        version: 1,
        stores: [
            {
                name: 'users',
                config: { keyPath: 'id', autoIncrement: true },
                indices: [
                    { name: 'email', keyPath: 'email', options: { unique: true } },
                    { name: 'role', keyPath: 'role' },
                    { name: 'age', keyPath: 'age' },
                    { name: 'createdAt', keyPath: 'createdAt' }
                ]
            },
            {
                name: 'posts',
                config: { keyPath: 'id', autoIncrement: true },
                indices: [
                    { name: 'authorId', keyPath: 'authorId' },
                    { name: 'status', keyPath: 'status' },
                    { name: 'category', keyPath: 'category' },
                    { name: 'createdAt', keyPath: 'createdAt' }
                ]
            }
        ]
    };

    // Utility functions
    window.log = function(message, type, outputId) {
        type = type || 'info';
        outputId = outputId || 'db-output';
        
        var output = document.getElementById(outputId);
        if (!output) return;
        
        var timestamp = new Date().toLocaleTimeString();
        var logEntry = document.createElement('div');
        logEntry.className = 'log-entry log-' + type;
        logEntry.textContent = '[' + timestamp + '] ' + message;
        output.appendChild(logEntry);
        output.scrollTop = output.scrollHeight;
    };

    window.clearOutput = function(outputId) {
        var output = document.getElementById(outputId);
        if (output) {
            output.innerHTML = '';
        }
    };

    window.getRandomItem = function(array) {
        return array[Math.floor(Math.random() * array.length)];
    };

})();