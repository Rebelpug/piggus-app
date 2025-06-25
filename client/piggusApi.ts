import { supabase } from '@/lib/supabase';

export interface ISINResult {
    Code: string;
    Exchange: string;
    Name: string;
    Type: string;
    Country: string;
    Currency: string;
    ISIN: string;
    previousClose: number;
    previousCloseDate: string;
}

export interface ISINLookupResponse {
    success: boolean;
    data?: ISINResult[];
    error?: string;
}

const mockedData = [
    {
        "Code": "ISFF702",
        "Exchange": "TA",
        "Name": "iShares Core S&P 500 UCITS ETF USD (Acc)",
        "Type": "ETF",
        "Country": "Israel",
        "Currency": "ILA",
        "ISIN": "IE00B5BMR087",
        "previousClose": 219880,
        "previousCloseDate": "2025-06-24"
    },
    {
        "Code": "CSP1",
        "Exchange": "LSE",
        "Name": "iShares Core S&P 500 UCITS ETF USD (Acc)",
        "Type": "ETF",
        "Country": "UK",
        "Currency": "GBX",
        "ISIN": "IE00B5BMR087",
        "previousClose": 47612,
        "previousCloseDate": "2025-06-24"
    },
    {
        "Code": "CSPX",
        "Exchange": "LSE",
        "Name": "iShares Core S&P 500 UCITS ETF USD (Acc)",
        "Type": "ETF",
        "Country": "UK",
        "Currency": "USD",
        "ISIN": "IE00B5BMR087",
        "previousClose": 648.45,
        "previousCloseDate": "2025-06-24"
    },
    {
        "Code": "SXR8",
        "Exchange": "XETRA",
        "Name": "iShares Core S&P 500 UCITS ETF USD (Acc)",
        "Type": "ETF",
        "Country": "Germany",
        "Currency": "EUR",
        "ISIN": "IE00B5BMR087",
        "previousClose": 558.02,
        "previousCloseDate": "2025-06-24"
    },
    {
        "Code": "CSSPX",
        "Exchange": "SW",
        "Name": "iShares Core S&P 500 UCITS ETF USD (Acc)",
        "Type": "ETF",
        "Country": "Switzerland",
        "Currency": "USD",
        "ISIN": "IE00B5BMR087",
        "previousClose": 648.4,
        "previousCloseDate": "2025-06-24"
    },
    {
        "Code": "CSPX",
        "Exchange": "AS",
        "Name": "iShares Core S&P 500 UCITS ETF USD (Acc) EUR",
        "Type": "ETF",
        "Country": "Netherlands",
        "Currency": "EUR",
        "ISIN": "IE00B5BMR087",
        "previousClose": 557.904,
        "previousCloseDate": "2025-06-24"
    },
    {
        "Code": "CSPXN",
        "Exchange": "MX",
        "Name": "iShares Core S&P 500 UCITS ETF USD (Acc)",
        "Type": "ETF",
        "Country": "Mexico",
        "Currency": "MXN",
        "ISIN": "IE00B5BMR087",
        "previousClose": 12351.3799,
        "previousCloseDate": "2025-06-24"
    },
    {
        "Code": "SXR8",
        "Exchange": "F",
        "Name": "iShares Core S&P 500 UCITS ETF USD (Acc)",
        "Type": "ETF",
        "Country": "Germany",
        "Currency": "EUR",
        "ISIN": "IE00B5BMR087",
        "previousClose": 559.92,
        "previousCloseDate": "2025-06-24"
    }
]

export const lookupISIN = async (isin: string): Promise<ISINLookupResponse> => {
    return {
        success: true,
        data: mockedData
    }
    // try {
    //     const { data, error } = await supabase.functions.invoke('piggusApp', {
    //         body: { isin: isin.trim() },
    //     });
    //
    //     if (error) {
    //         console.error('ISIN lookup error:', error);
    //         return { success: false, error: error.message };
    //     }
    //
    //     return { success: true, data };
    // } catch (error: any) {
    //     console.error('Failed to lookup ISIN:', error);
    //     return { success: false, error: error.message };
    // }
};
