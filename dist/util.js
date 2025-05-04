// utils.js
export function fakeResponse(message = 'Offline. Request queued.') {
  return new Response(JSON.stringify({ message }), {
    status: 202,
    headers: { 'Content-Type': 'application/json' }
  });
}

