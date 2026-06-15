import { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import useStore from '../store/useStore.js';
import { getCafes, getCafeAccount } from '../api/customer.js';

// Shared loader for every /cafe/:cafeId/* page.
// - Ensures store.currentCafe matches the :cafeId in the URL
//   (works even on a hard refresh / direct link)
// - Loads this customer's per-cafe account (balance, credit, status)
// - Loads promotions for this specific cafe
export default function useCafeContext() {
  const { cafeId } = useParams();
  const currentCafe = useStore(s => s.currentCafe);
  const cafeAccount = useStore(s => s.cafeAccount);
  const setCurrentCafe = useStore(s => s.setCurrentCafe);
  const setCafeAccount = useStore(s => s.setCafeAccount);
  const [promotions, setPromotions] = useState([]);
  const [loading, setLoading] = useState(true);

  async function refreshAccount() {
    try {
      const acc = await getCafeAccount(cafeId);
      setCafeAccount(acc);
    } catch {
      setCafeAccount(null);
    }
  }

  useEffect(() => {
    let mounted = true;

    async function load() {
      setLoading(true);
      try {
        const data = await getCafes();
        if (!mounted) return;

        const cafe = data.cafes.find(c => c.id === cafeId);
        if (cafe) setCurrentCafe(cafe);
        setPromotions(data.promotions.filter(p => p.cafe_id === cafeId));

        await refreshAccount();
      } catch (err) {
        console.error(err);
      } finally {
        if (mounted) setLoading(false);
      }
    }

    load();
    return () => { mounted = false; };
  }, [cafeId]);

  return { cafeId, cafe: currentCafe, cafeAccount, promotions, loading, refreshAccount };
}
