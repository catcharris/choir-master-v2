const part = '베이스';
const encoded = btoa(encodeURIComponent(part));
console.log('Encoded:', encoded);
const decoded = decodeURIComponent(atob(encoded));
console.log('Decoded:', decoded);
