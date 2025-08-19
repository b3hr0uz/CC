#!/usr/bin/env node

/**
 * Page Pre-compilation Script
 * Pre-compiles critical pages to eliminate first-visit delays
 */

const https = require('https');
const http = require('http');

// Critical pages to pre-compile
const PAGES_TO_PRECOMPILE = [
  '/',              // Home page
  '/dashboard',     // Dashboard
  '/assistant',     // Assistant
  '/training',      // Training
  '/login',         // Login
  '/profile',       // Profile
  '/settings',      // Settings
  '/terms',         // Terms
  '/privacy',       // Privacy
];

// Configuration
const BASE_URL = process.env.PREBUILD_BASE_URL || 'http://localhost:3000';
const TIMEOUT = 30000; // 30 seconds timeout
const CONCURRENT_REQUESTS = 3; // Process 3 pages at once

console.log('🏗️  Starting page pre-compilation...');
console.log(`📍 Base URL: ${BASE_URL}`);
console.log(`📄 Pages to pre-compile: ${PAGES_TO_PRECOMPILE.length}`);

/**
 * Fetch a page to trigger pre-compilation
 */
async function precompilePage(path) {
  return new Promise((resolve, reject) => {
    const url = `${BASE_URL}${path}`;
    const startTime = Date.now();
    
    console.log(`🔄 Pre-compiling: ${path}`);
    
    const module = url.startsWith('https://') ? https : http;
    const options = {
      method: 'GET',
      timeout: TIMEOUT,
      headers: {
        'User-Agent': 'Page-Precompiler/1.0',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
        'Accept-Language': 'en-US,en;q=0.5',
        'Accept-Encoding': 'gzip, deflate',
        'Connection': 'keep-alive',
        'Upgrade-Insecure-Requests': '1',
      }
    };
    
    const req = module.get(url, options, (res) => {
      const duration = Date.now() - startTime;
      
      if (res.statusCode >= 200 && res.statusCode < 300) {
        console.log(`✅ Pre-compiled: ${path} (${res.statusCode}) - ${duration}ms`);
        
        // Consume the response data to complete the request
        let data = '';
        res.on('data', chunk => data += chunk);
        res.on('end', () => resolve({ path, status: res.statusCode, duration, size: data.length }));
      } else {
        console.log(`⚠️  Warning: ${path} returned ${res.statusCode} - ${duration}ms`);
        res.resume(); // Consume response data
        resolve({ path, status: res.statusCode, duration, error: `HTTP ${res.statusCode}` });
      }
    });
    
    req.on('timeout', () => {
      req.destroy();
      console.log(`⏰ Timeout: ${path} (${TIMEOUT}ms)`);
      reject(new Error(`Timeout for ${path}`));
    });
    
    req.on('error', (error) => {
      console.log(`❌ Error: ${path} - ${error.message}`);
      reject(error);
    });
    
    req.setTimeout(TIMEOUT);
  });
}

/**
 * Process pages in batches to avoid overwhelming the server
 */
async function precompileInBatches(pages, batchSize) {
  const results = [];
  
  for (let i = 0; i < pages.length; i += batchSize) {
    const batch = pages.slice(i, i + batchSize);
    console.log(`📦 Processing batch ${Math.floor(i / batchSize) + 1}/${Math.ceil(pages.length / batchSize)}: ${batch.join(', ')}`);
    
    try {
      const batchResults = await Promise.allSettled(
        batch.map(path => precompilePage(path))
      );
      
      batchResults.forEach((result, index) => {
        if (result.status === 'fulfilled') {
          results.push(result.value);
        } else {
          results.push({ 
            path: batch[index], 
            error: result.reason.message,
            duration: 0 
          });
        }
      });
      
      // Small delay between batches
      if (i + batchSize < pages.length) {
        console.log('⏸️  Waiting 2s before next batch...');
        await new Promise(resolve => setTimeout(resolve, 2000));
      }
      
    } catch (error) {
      console.error(`❌ Batch error:`, error);
    }
  }
  
  return results;
}

/**
 * Wait for server to be ready
 */
async function waitForServer(maxRetries = 30) {
  console.log('⏳ Waiting for server to be ready...');
  
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      await precompilePage('/');
      console.log(`✅ Server is ready (attempt ${attempt})`);
      return true;
    } catch (error) {
      console.log(`⏳ Server not ready (attempt ${attempt}/${maxRetries}): ${error.message}`);
      
      if (attempt < maxRetries) {
        await new Promise(resolve => setTimeout(resolve, 2000));
      }
    }
  }
  
  throw new Error('Server failed to become ready within timeout period');
}

/**
 * Generate summary report
 */
function generateReport(results) {
  console.log('\n📊 Pre-compilation Summary Report:');
  console.log('═'.repeat(50));
  
  const successful = results.filter(r => !r.error && r.status >= 200 && r.status < 300);
  const warnings = results.filter(r => !r.error && (r.status >= 300 || r.status < 200));
  const errors = results.filter(r => r.error);
  
  console.log(`✅ Successful: ${successful.length}/${results.length}`);
  console.log(`⚠️  Warnings: ${warnings.length}/${results.length}`);
  console.log(`❌ Errors: ${errors.length}/${results.length}`);
  
  if (successful.length > 0) {
    const avgTime = successful.reduce((sum, r) => sum + r.duration, 0) / successful.length;
    const totalSize = successful.reduce((sum, r) => sum + (r.size || 0), 0);
    console.log(`⏱️  Average response time: ${avgTime.toFixed(0)}ms`);
    console.log(`📦 Total content pre-compiled: ${(totalSize / 1024).toFixed(1)}KB`);
  }
  
  console.log('\n📋 Detailed Results:');
  results.forEach(result => {
    const status = result.error ? `❌ ${result.error}` : 
                  result.status >= 200 && result.status < 300 ? `✅ ${result.status}` :
                  `⚠️  ${result.status}`;
    const duration = result.duration > 0 ? `${result.duration}ms` : 'N/A';
    const size = result.size ? `(${(result.size / 1024).toFixed(1)}KB)` : '';
    console.log(`  ${result.path.padEnd(15)} ${status} ${duration} ${size}`);
  });
  
  console.log('═'.repeat(50));
  
  return {
    total: results.length,
    successful: successful.length,
    warnings: warnings.length,
    errors: errors.length
  };
}

/**
 * Main execution
 */
async function main() {
  const startTime = Date.now();
  
  try {
    // Wait for server to be ready
    await waitForServer();
    
    // Pre-compile all pages
    const results = await precompileInBatches(PAGES_TO_PRECOMPILE, CONCURRENT_REQUESTS);
    
    // Generate report
    const summary = generateReport(results);
    
    const totalTime = Date.now() - startTime;
    console.log(`\n🎉 Pre-compilation completed in ${(totalTime / 1000).toFixed(1)}s`);
    
    // Exit with appropriate code
    if (summary.errors > 0) {
      console.log('⚠️  Some pages failed to pre-compile, but continuing...');
      process.exit(0); // Don't fail the build for pre-compilation issues
    } else {
      console.log('✅ All pages pre-compiled successfully!');
      process.exit(0);
    }
    
  } catch (error) {
    console.error('❌ Pre-compilation failed:', error.message);
    console.log('⚠️  Continuing build despite pre-compilation failure...');
    process.exit(0); // Don't fail the build
  }
}

// Handle process signals
process.on('SIGTERM', () => {
  console.log('\n⏹️  Pre-compilation interrupted');
  process.exit(0);
});

process.on('SIGINT', () => {
  console.log('\n⏹️  Pre-compilation interrupted');
  process.exit(0);
});

// Run the script
main();
