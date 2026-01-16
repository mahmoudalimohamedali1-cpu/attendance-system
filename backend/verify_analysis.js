
const http = require('http');

const data = JSON.stringify({
    policyText: "إذا الموظف كان ليه طفل ذكر تحت ال 5 سنين يزيد راتبه 2000 ريال"
});

const options = {
    hostname: 'localhost',
    port: 3000,
    path: '/api/v1/smart-policies/analyze-schema',
    method: 'POST',
    headers: {
        'Content-Type': 'application/json',
        'Content-Length': data.length
    }
};

const req = http.request(options, (res) => {
    let body = '';
    res.on('data', (chunk) => body += chunk);
    res.on('end', () => {
        console.log('STATUS:', res.statusCode);
        try {
            const parsed = JSON.parse(body);
            console.log('RESPONSE:', JSON.stringify(parsed, null, 2));
        } catch (e) {
            console.log('RAW BODY:', body);
        }
    });
});

req.on('error', (e) => {
    console.error('ERROR:', e.message);
});

req.write(data);
req.end();
