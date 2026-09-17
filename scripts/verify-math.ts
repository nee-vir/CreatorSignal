import { calculateMedian, extractVideoId } from '../lib/analytics/outlier';
import { calculateVph } from '../lib/analytics/vph';

function assert(condition: boolean, message: string) {
  if (!condition) {
    console.error(`❌ Assertion failed: ${message}`);
    process.exit(1);
  } else {
    console.log(`✅ Passed: ${message}`);
  }
}

console.log('--- Testing Statistical Median Calculation ---');
// Odd length: [10, 20, 30, 40, 50] -> 30
assert(calculateMedian([50, 10, 30, 20, 40]) === 30, 'Median with odd number of elements');

// Even length: [10, 20, 30, 40] -> (20 + 30) / 2 = 25
assert(calculateMedian([40, 10, 30, 20]) === 25, 'Median with even number of elements');

// Single element
assert(calculateMedian([100]) === 100, 'Median with single element');

// Empty array
assert(calculateMedian([]) === 0, 'Median with empty array');

console.log('\n--- Testing YouTube Video ID Extraction ---');
assert(extractVideoId('dQw4w9WgXcQ') === 'dQw4w9WgXcQ', 'Raw 11-char ID');
assert(extractVideoId('https://www.youtube.com/watch?v=dQw4w9WgXcQ') === 'dQw4w9WgXcQ', 'Standard watch URL');
assert(extractVideoId('https://youtu.be/dQw4w9WgXcQ') === 'dQw4w9WgXcQ', 'Short youtu.be URL');
assert(extractVideoId('https://www.youtube.com/shorts/dQw4w9WgXcQ') === 'dQw4w9WgXcQ', 'YouTube Shorts URL');
assert(extractVideoId('https://www.youtube.com/watch?feature=shared&v=dQw4w9WgXcQ') === 'dQw4w9WgXcQ', 'URL with extra query params');

console.log('\n--- Testing Views Per Hour (VPH) Momentum ---');
const start = new Date('2026-09-17T10:00:00Z');
const end = new Date('2026-09-17T12:00:00Z'); // 2 hours elapsed
// 1,000 views in 2 hours = 500 VPH
const vph = calculateVph(1000, 2000, start, end);
assert(vph === 500, `Calculated VPH: ${vph} (expected 500)`);

// 420 views in 1 hour = 420 VPH
const oneHourLater = new Date('2026-09-17T11:00:00Z');
const vph420 = calculateVph(0, 420, start, oneHourLater);
assert(vph420 === 420, `Calculated VPH: ${vph420} (expected 420)`);

console.log('\n🎉 ALL MATHEMATICAL LOGIC TESTS PASSED SUCCESSFULLY!');
