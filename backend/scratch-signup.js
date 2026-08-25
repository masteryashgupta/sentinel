import fetch from 'node-fetch';

async function test() {
  const res = await fetch('http://localhost:4000/api/auth/signup', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: 'test3@gmail.com', password: 'password123' })
  });
  console.log(res.status);
  console.log(await res.text());
}
test();
