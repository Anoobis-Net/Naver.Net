export default async function handler(request) {

    /* CORS preflight */
    if (request.method === 'OPTIONS') {
        return new Response(null, {
            headers: {
                'Access-Control-Allow-Origin': '*',
                'Access-Control-Allow-Methods': 'GET, OPTIONS',
                'Access-Control-Allow-Headers': '*',
            }
        });
    }

    const url = new URL(request.url);

    /* 단일 종목: ?symbol=^IXIC
       복수 종목: ?symbols=^IXIC,^GSPC,^KS11  */
    const single  = url.searchParams.get('symbol');
    const multi   = url.searchParams.get('symbols');
    const symbols = multi || single;

    if (!symbols) {
        return new Response(JSON.stringify({ error: 'symbol 또는 symbols 파라미터 필요' }), {
            status: 400,
            headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' }
        });
    }

    const reqHeaders = {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'Accept': 'application/json, text/plain, */*',
        'Accept-Language': 'ko-KR,ko;q=0.9,en-US;q=0.8',
        'Referer': 'https://finance.yahoo.com/',
        'Origin': 'https://finance.yahoo.com',
    };

    /* 복수 종목은 v7/quote 로 한번에 처리 */
    const targets = [
        `https://query1.finance.yahoo.com/v7/finance/quote?symbols=${encodeURIComponent(symbols)}`,
        `https://query2.finance.yahoo.com/v7/finance/quote?symbols=${encodeURIComponent(symbols)}`,
        `https://query1.finance.yahoo.com/v8/finance/chart/${encodeURIComponent(symbols)}?interval=1d&range=1d`,
        `https://query2.finance.yahoo.com/v8/finance/chart/${encodeURIComponent(symbols)}?interval=1d&range=1d`,
    ];

    for (const target of targets) {
        try {
            const res = await fetch(target, { headers: reqHeaders });
            if (!res.ok) continue;
            const data = await res.json();
            return new Response(JSON.stringify(data), {
                headers: {
                    'Content-Type': 'application/json',
                    'Access-Control-Allow-Origin': '*',
                    'Cache-Control': 'no-cache',
                }
            });
        } catch (e) {
            continue;
        }
    }

    return new Response(JSON.stringify({ error: '모든 엔드포인트 실패' }), {
        status: 502,
        headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' }
    });
}

export const config = { path: '/api/yahoo' };
