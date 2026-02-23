const name = "베이스";
const b64 = Buffer.from(name).toString('base64');
console.log(b64);
const safeB64 = b64.replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
console.log(safeB64);
const original = Buffer.from(safeB64.replace(/-/g, '+').replace(/_/g, '/'), 'base64').toString('utf8');
console.log(original);
