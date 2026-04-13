import handler from './api/stocks/quotes.js';

const req = { query: { market: 'india', limit: 2 } };
const res = {
  status: (code) => {
    console.log("Status:", code);
    return res;
  },
  json: (data) => console.log(JSON.stringify(data, null, 2)),
  setHeader: (k, v) => {}
};

try {
  handler(req, res);
} catch (e) {
  console.error(e);
}
