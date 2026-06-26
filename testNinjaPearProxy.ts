// ============================================================
// NinjaPear Proxy Edge Function Test
// Run from browser console: import('/src/testNinjaPearProxy.ts')
// or copy the test() function into the console.
// ============================================================

import { invokeEdgeFunction, NINJAPEAR_PROXY_FUNCTION, SUPABASE_URL, SUPABASE_ANON_KEY } from './constants/config';

interface ProxyResult {
  success: boolean;
  html?: string;
  text?: string;
  error?: string;
  rawResponse?: unknown;
}

async function runTest(url: string): Promise<ProxyResult> {
  console.log(`🔍 Testing NinjaPear Proxy with URL: ${url}`);
  console.log(`   Edge Function: ${NINJAPEAR_PROXY_FUNCTION}`);
  console.log(`   Supabase URL: ${SUPABASE_URL}`);

  try {
    const response = await fetch(
      `${SUPABASE_URL}/functions/v1/${NINJAPEAR_PROXY_FUNCTION}`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${SUPABASE_ANON_KEY}`,
        },
        body: JSON.stringify({
          url,
          action: 'fetch_page',
        }),
      }
    );

    const rawResponse = await response.json();
    console.log('📦 Raw response:', rawResponse);

    if (!response.ok) {
      console.error(`❌ HTTP ${response.status}:`, rawResponse);
      return { success: false, error: `HTTP ${response.status}: ${JSON.stringify(rawResponse)}`, rawResponse };
    }

    if (rawResponse.success && rawResponse.html) {
      console.log(`✅ Success! Received ${rawResponse.html.length} chars of HTML`);
      console.log(`   Title snippet: ${rawResponse.html.slice(0, 200).replace(/\n/g, ' ')}...`);
      console.log(`   Text snippet: ${(rawResponse.text || '').slice(0, 200)}...`);
      return {
        success: true,
        html: rawResponse.html,
        text: rawResponse.text,
        rawResponse,
      };
    }

    console.warn('⚠️ Response indicates failure:', rawResponse.error || 'Unknown error');
    return { success: false, error: rawResponse.error || 'Unknown error', rawResponse };
  } catch (err: unknown) {
    const error = err as Error;
    console.error('❌ Exception:', error.message);
    return { success: false, error: error.message };
  }
}

/**
 * Run this in the browser console to test.
 *
 * Usage:
 *   import('/src/testNinjaPearProxy.ts').then(m => m.test('https://example.com'))
 *
 * Or run with a few test URLs:
 *   import('/src/testNinjaPearProxy.ts').then(m => m.testAll())
 */
export async function test(url = 'https://example.com') {
  console.clear();
  console.log('%c🧪 NinjaPear Proxy Test', 'font-size: 18px; font-weight: bold;');
  console.log('='.repeat(50));
  const result = await runTest(url);
  console.log('='.repeat(50));
  if (result.success) {
    console.log(`%c✅ TEST PASSED — ${url}`, 'color: #10b981; font-size: 14px;');
  } else {
    console.log(`%c❌ TEST FAILED — ${url}`, 'color: #ef4444; font-size: 14px;');
    console.log(`   Error: ${result.error}`);
  }
  return result;
}

export async function testAll() {
  const urls = [
    'https://example.com',
    'https://httpbin.org/html',
    'https://en.wikipedia.org/wiki/Sales',
  ];
  for (const url of urls) {
    await test(url);
    console.log('\n');
  }
}

export default test;
