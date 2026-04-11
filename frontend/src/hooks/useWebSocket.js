import { useState, useEffect, useRef, useCallback } from 'react';
import { stocksAPI } from '../api';

/**
 * useStockPrices — replaces useWebSocket with polling for Vercel compatibility.
 * Polls stock prices every `interval` ms for the given symbols.
 */
export function useStockPrices(symbols = [], interval = 15000) {
  const [data, setData] = useState({});
  const [connected, setConnected] = useState(false);
  const intervalRef = useRef(null);
  const symbolsRef = useRef(symbols);

  // Keep symbols ref up to date
  useEffect(() => {
    symbolsRef.current = symbols;
  }, [symbols]);

  const fetchPrices = useCallback(async () => {
    const currentSymbols = symbolsRef.current;
    if (!currentSymbols || currentSymbols.length === 0) return;

    try {
      // Fetch quotes for all symbols in parallel (limited batches)
      const batchSize = 5;
      const batches = [];
      for (let i = 0; i < currentSymbols.length; i += batchSize) {
        batches.push(currentSymbols.slice(i, i + batchSize));
      }

      for (const batch of batches) {
        const results = await Promise.allSettled(
          batch.map(symbol => stocksAPI.getQuote(symbol))
        );

        const updates = {};
        results.forEach((result, idx) => {
          if (result.status === 'fulfilled' && result.value?.data && !result.value.data.error) {
            const quote = result.value.data;
            updates[quote.symbol] = quote;
          }
        });

        if (Object.keys(updates).length > 0) {
          setData(prev => ({ ...prev, ...updates }));
        }
      }
      setConnected(true);
    } catch (err) {
      console.error('Price polling error:', err);
      setConnected(false);
    }
  }, []);

  useEffect(() => {
    if (!symbols || symbols.length === 0) return;

    // Initial fetch
    fetchPrices();

    // Set up polling interval
    intervalRef.current = setInterval(fetchPrices, interval);

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    };
  }, [symbols.join(','), interval, fetchPrices]);

  const subscribe = useCallback((newSymbols) => {
    // Add new symbols to watch
    symbolsRef.current = [...new Set([...symbolsRef.current, ...newSymbols])];
  }, []);

  const unsubscribe = useCallback((oldSymbols) => {
    symbolsRef.current = symbolsRef.current.filter(s => !oldSymbols.includes(s));
  }, []);

  return { data, connected, subscribe, unsubscribe };
}

// Keep backward compatibility with the old name
export { useStockPrices as useWebSocket };
