// In-memory API used only by browser tests; not a replacement for database integration tests.
import http from 'node:http';
let articles = [];
let barberVisible = true;
const send = (res, status, data, pagination) => { res.writeHead(status, { 'content-type': 'application/json' }); res.end(JSON.stringify({ status, message: 'success', data, pagination })); };
const body = req => new Promise(resolve => { let result = ''; req.on('data', c => result += c); req.on('end', () => { try { resolve(JSON.parse(result)); } catch { resolve({}); } }); });
http.createServer(async (req, res) => {
  const u = new URL(req.url, 'http://localhost:43101'), p = u.pathname;
  if (p === '/__test/reset') { barberVisible = true; articles = []; return send(res, 200, {}); }
  if (p === '/__test/hide-barber') { barberVisible = false; return send(res, 200, {}); }
  if (p === '/api/auth/me') return send(res, 200, { id: 1, fullName: 'مدیر آزمایشی', phone: '09121234567', roles: ['admin'], isActive: true });
  if (p === '/api/admin/withdrawals') return send(res, 200, { items: [], summary: { pendingCount: 0 } });
  if (p === '/api/admin/blog' && req.method === 'POST') { const article = { ...(await body(req)), id: 1, createdAt: new Date().toISOString(), updatedAt: new Date().toISOString(), publishedAt: new Date().toISOString() }; articles = [article]; return send(res, 201, article); }
  if (p === '/api/admin/blog' && req.method === 'GET') return send(res, 200, articles, { page: 1, totalPages: 1, total: articles.length, limit: 12 });
  if (p === '/api/admin/blog/1' && req.method === 'GET') return send(res, 200, articles[0]);
  if (p === '/api/admin/blog/1' && req.method === 'PUT') { articles[0] = { ...articles[0], ...(await body(req)) }; return send(res, 200, articles[0]); }
  if (p === '/api/admin/blog/1' && req.method === 'DELETE') { articles = []; return send(res, 200, { deleted: true }); }
  if (p === '/api/blog') return send(res, 200, articles.filter(x => x.status === 'published'), { page: 1, totalPages: 1 });
  if (p === '/api/blog/sitemap') return send(res, 200, []);
  if (p === '/api/blog/barbers/73' && !barberVisible) return send(res, 404, null);
  if (p === '/api/blog/barbers/73') return send(res, 200, { id: 73, slug: 'salon-test', salonName: 'سالن آزمایشی', profileImage: null, city: null, rating: 5 });
  if (p === '/api/barber') return send(res, 200, [{ id: 73, salonName: 'سالن آزمایشی' }], { page: 1, totalPages: 1 });
  if (p === '/api/blog/test-blog') { const article = articles.find(x => x.slug === 'test-blog' && x.status === 'published'); return article ? send(res, 200, article) : send(res, 404, null); }
  return send(res, 404, null);
}).listen(43101, '0.0.0.0', () => console.log('Blog mock API ready'));
