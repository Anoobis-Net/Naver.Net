export default async function handler(request) {
    if (request.method === 'OPTIONS') {
        return new Response(null, {
            headers: {
                'Access-Control-Allow-Origin': '*',
                'Access-Control-Allow-Methods': 'GET, OPTIONS',
                'Access-Control-Allow-Headers': '*',
            }
        });
    }

    const url     = new URL(request.url);
    const single  = url.searchParams.get('symbol');   // 구버전 단일 호환
    const multi   = url.searchParams.get('symbols');  // 신버전 복수

    const rawList = multi || single;
    if (!rawList) {
        return new Response(JSON.stringify({ error: 'symbol 또는 symbols 파라미터 필요' }), {
            status: 400,
            headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' }
        });
    }

    const headers = {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'Accept': 'application/json, */*',
        'Accept-Language': 'ko-KR,ko;q=0.9,en-US;q=0.8',
        'Referer': 'https://finance.yahoo.com/',
        'Origin': 'https://finance.yahoo.com',
    };

    const encoded = encodeURIComponent(rawList);

    // 복수 심볼은 v7/quote 로만 시도 (chart는 단일 심볼 전용)
    const isMulti = rawList.includes(',');

    const targets = isMulti ? [
        `https://query1.finance.yahoo.com/v7/finance/quote?symbols=${encoded}`,
        `https://query2.finance.yahoo.com/v7/finance/quote?symbols=${encoded}`,
    ] : [
        `https://query1.finance.yahoo.com/v8/finance/chart/${encoded}?interval=1d&range=1d`,
        `https://query2.finance.yahoo.com/v8/finance/chart/${encoded}?interval=1d&range=1d`,
        `https://query1.finance.yahoo.com/v7/finance/quote?symbols=${encoded}`,
        `https://query2.finance.yahoo.com/v7/finance/quote?symbols=${encoded}`,
    ];

    for (const target of targets) {
        try {
            const res = await fetch(target, { headers });
            if (!res.ok) continue;
            const data = await res.json();
            return new Response(JSON.stringify(data), {
                headers: {
                    'Content-Type': 'application/json',
                    'Access-Control-Allow-Origin': '*',
                    'Cache-Control': 'no-cache'
                }
            });
        } catch { continue; }
    }

    return new Response(JSON.stringify({ error: '모든 엔드포인트 실패' }), {
        status: 502,
        headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' }
    });
}

export const config = { path: '/api/stock' };
