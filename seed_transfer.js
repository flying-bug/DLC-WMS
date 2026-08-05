const http = require('http');
const https = require('https');

const API_BASE = 'http://localhost:8080/api/v1';

async function request(method, path, body = null, token = null) {
  return new Promise((resolve, reject) => {
    const url = new URL(API_BASE + path);
    const options = {
      method,
      hostname: url.hostname,
      port: url.port,
      path: url.pathname + url.search,
      headers: {
        'Content-Type': 'application/json'
      }
    };
    
    if (token) {
      options.headers['Authorization'] = `Bearer ${token}`;
    }

    const req = http.request(options, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        try {
          const json = JSON.parse(data);
          resolve({ status: res.statusCode, data: json });
        } catch (e) {
          resolve({ status: res.statusCode, data });
        }
      });
    });

    req.on('error', reject);

    if (body) {
      req.write(JSON.stringify(body));
    }
    req.end();
  });
}

async function seed() {
  try {
    console.log('Logging in...');
    // Try to login as manager
    const loginRes = await request('POST', '/auth/login', {
      username: 'manager@duylong.vn',
      password: 'password'
    });
    
    let token = loginRes.data?.data?.token;
    if (!token) {
      const loginRes2 = await request('POST', '/auth/login', {
        username: 'manager@duylong.vn',
        password: '123456'
      });
      token = loginRes2.data?.data?.token;
    }
    
    if (!token) {
      // Try no token if auth is disabled
      console.log('Login failed, trying without token...');
    } else {
      console.log('Login successful');
    }

    // Get warehouses
    console.log('Fetching warehouses...');
    const whRes = await request('GET', '/warehouses', null, token);
    console.log('whRes:', whRes.status, whRes.data);
    const warehouses = whRes.data?.data?.content || whRes.data?.content || whRes.data || [];
    
    // Get products
    console.log('Fetching products...');
    const prodRes = await request('GET', '/products?page=0&size=50', null, token);
    console.log('prodRes:', prodRes.status, prodRes.data);
    const products = prodRes.data?.data?.content || prodRes.data?.content || prodRes.data || [];
    if (!warehouses || warehouses.length < 2) {
      console.log('Not enough warehouses. We have:', warehouses);
      return;
    }
    if (!products || products.length === 0) {
      console.log('No products found.', products);
      return;
    }

    const w1 = warehouses[0]?.id;
    const w2 = warehouses[1]?.id || warehouses[0]?.id; // Fallback if only 1 warehouse
    const p1 = products[0];
    const p2 = products[1] || products[0];

    console.log('w1:', w1, 'w2:', w2, 'p1.id:', p1?.id);

    console.log('Creating transfer slips...');
    const now = new Date();
    
    for (let i = 1; i <= 15; i++) {
      const date = new Date(now);
      date.setDate(date.getDate() - (15 - i));
      
      const payload = {
        transferDate: date.toISOString().split('T')[0],
        fromWarehouseId: i % 2 === 0 ? w1 : w2,
        toWarehouseId: i % 2 === 0 ? w2 : w1,
        note: `Phiếu chuyển kho test ${i}`,
        deliverer: `Nhân viên giao hàng ${i}`,
        status: i > 10 ? 'POSTED' : (i > 5 ? 'DRAFT' : 'CANCELLED'),
        lines: [
          {
            variantId: p1.id,
            quantity: Math.floor(Math.random() * 5) + 1,
            price: 50000,
            note: 'Chuyển hàng test'
          }
        ]
      };

      if (i % 3 === 0) {
        payload.lines.push({
          variantId: p2.id,
          quantity: Math.floor(Math.random() * 3) + 1,
          price: 150000,
          note: 'Chuyển thêm'
        });
      }

      const createRes = await request('POST', '/stock-transfers', payload, token);
      if (createRes.status >= 200 && createRes.status < 300) {
        console.log(`Created transfer slip ${i}`);
      } else {
        console.log(`Failed to create transfer slip ${i}:`, createRes.status, createRes.data);
      }
    }
    
    console.log('Seeding completed!');
  } catch (err) {
    console.error('Error:', err);
  }
}

seed();
