import http from 'k6/http';
import { check, fail, group, sleep } from 'k6';

const BASE_URL = (__ENV.BASE_URL || 'http://localhost:8080/api/v1').replace(/\/$/, '');
const PROFILE = (__ENV.PROFILE || 'smoke').toLowerCase();

const profiles = {
    smoke: {
        executor: 'shared-iterations',
        vus: 1,
        iterations: 5,
        maxDuration: '1m'
    },
    load: {
        executor: 'ramping-vus',
        startVUs: 0,
        stages: [
            { duration: '30s', target: 5 },
            { duration: '1m', target: 10 },
            { duration: '30s', target: 0 }
        ],
        gracefulRampDown: '15s'
    }
};

if (!profiles[PROFILE]) {
    throw new Error(`PROFILE không hợp lệ: ${PROFILE}. Chỉ hỗ trợ smoke hoặc load.`);
}

export const options = {
    scenarios: {
        system_read: profiles[PROFILE]
    },
    thresholds: {
        checks: ['rate>0.99'],
        http_req_failed: ['rate<0.01'],
        http_req_duration: ['p(95)<1200', 'p(99)<2500'],
        'http_req_duration{endpoint:dashboard}': ['p(95)<1500'],
        'http_req_duration{endpoint:purchase_orders}': ['p(95)<1200'],
        'http_req_duration{endpoint:sales_orders}': ['p(95)<1200'],
        'http_req_duration{endpoint:products}': ['p(95)<1200'],
        'http_req_duration{endpoint:warehouses}': ['p(95)<1200']
    }
};

function parseJson(response, label) {
    try {
        return response.json();
    } catch (_) {
        fail(`${label} không trả JSON hợp lệ (HTTP ${response.status}).`);
    }
}

export function setup() {
    if (__ENV.AUTH_TOKEN) {
        return { token: __ENV.AUTH_TOKEN };
    }

    if (!__ENV.USERNAME || !__ENV.PASSWORD) {
        fail('Cần AUTH_TOKEN hoặc USERNAME và PASSWORD để chạy kiểm thử API.');
    }

    const response = http.post(
        `${BASE_URL}/auth/login`,
        JSON.stringify({ username: __ENV.USERNAME, password: __ENV.PASSWORD }),
        {
            headers: { 'Content-Type': 'application/json' },
            tags: { endpoint: 'login' },
            timeout: '15s'
        }
    );

    const body = parseJson(response, 'Đăng nhập');
    const passed = check(response, {
        'login trả HTTP 200': (res) => res.status === 200,
        'login trả token': () => Boolean(body?.data?.token)
    });

    if (!passed) {
        fail(`Không đăng nhập được vào ${BASE_URL}.`);
    }

    return { token: body.data.token };
}

function assertApiResponse(response, label) {
    let body;
    try {
        body = response.json();
    } catch (_) {
        body = null;
    }

    check(response, {
        [`${label}: HTTP 200`]: (res) => res.status === 200,
        [`${label}: success=true`]: () => body?.success === true
    });
}

function assertPageResponse(response, label) {
    let body;
    try {
        body = response.json();
    } catch (_) {
        body = null;
    }

    check(response, {
        [`${label}: HTTP 200`]: (res) => res.status === 200,
        [`${label}: content là mảng`]: () => Array.isArray(body?.content)
    });
}

export default function (data) {
    const params = {
        headers: {
            Authorization: `Bearer ${data.token}`,
            Accept: 'application/json'
        },
        timeout: '15s'
    };

    group('dashboard and master data reads', () => {
        const responses = http.batch([
            ['GET', `${BASE_URL}/reports/dashboard?inventoryFlowRange=7days&categoryScope=all`, null, {
                ...params,
                tags: { endpoint: 'dashboard' }
            }],
            ['GET', `${BASE_URL}/purchase-orders`, null, {
                ...params,
                tags: { endpoint: 'purchase_orders' }
            }],
            ['GET', `${BASE_URL}/sales-orders?page=0&size=20`, null, {
                ...params,
                tags: { endpoint: 'sales_orders' }
            }],
            ['GET', `${BASE_URL}/products?page=0&size=20`, null, {
                ...params,
                tags: { endpoint: 'products' }
            }],
            ['GET', `${BASE_URL}/warehouses?page=0&size=20`, null, {
                ...params,
                tags: { endpoint: 'warehouses' }
            }]
        ]);

        assertApiResponse(responses[0], 'Dashboard');
        assertApiResponse(responses[1], 'Đơn mua hàng');
        assertApiResponse(responses[2], 'Đơn bán hàng');
        // ProductController trả Spring Page trực tiếp, không bọc ApiResponse.
        assertPageResponse(responses[3], 'Sản phẩm');
        assertApiResponse(responses[4], 'Kho');
    });

    sleep(1);
}
