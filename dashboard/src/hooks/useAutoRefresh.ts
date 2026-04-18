import { useEffect, useRef, useState } from "react";

export function useAutoRefresh(callback: () => void, intervalMs = 30000) {
  const [countdown, setCountdown] = useState(intervalMs / 1000);
  const saved = useRef(callback);
  saved.current = callback;

  useEffect(() => {
    const interval = setInterval(() => {
      saved.current();
      setCountdown(intervalMs / 1000);
    }, intervalMs);

    const tick = setInterval(() => {
      setCountdown((c) => (c <= 1 ? intervalMs / 1000 : c - 1));
    }, 1000);

    return () => { clearInterval(interval); clearInterval(tick); };
  }, [intervalMs]);

  return countdown;
}
