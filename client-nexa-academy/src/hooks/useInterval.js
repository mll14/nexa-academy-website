import { useEffect, useRef } from "react";

export function useInterval(cb, delay) {
  const savedCb = useRef();
  useEffect(() => {
    savedCb.current = cb;
  }, [cb]);

  useEffect(() => {
    if (delay == null) return;
    const tick = () => savedCb.current && savedCb.current();
    const id = setInterval(tick, delay);
    return () => clearInterval(id);
  }, [delay]);
}

export default useInterval;
