import { useEffect, useRef, useState } from "react";

export function usePracticeClock(duration: number, onFinish: () => void) {
  const [remaining, setRemaining] = useState(duration);
  const [running, setRunning] = useState(false);
  const deadline = useRef(0);
  const callback = useRef(onFinish);
  callback.current = onFinish;
  const ended = useRef(false);
  useEffect(() => {
    if (!running) return;
    const tick = () => {
      const left = Math.max(
        0,
        Math.ceil((deadline.current - Date.now()) / 1000),
      );
      setRemaining(left);
      if (!left && !ended.current) {
        ended.current = true;
        setRunning(false);
        callback.current();
      }
    };
    tick();
    const id = window.setInterval(tick, 200);
    return () => clearInterval(id);
  }, [running]);
  return {
    remaining,
    running,
    start: () => {
      if (remaining > 0) {
        deadline.current = Date.now() + remaining * 1000;
        setRunning(true);
      }
    },
    pause: () => {
      if (!running) return;
      const left = Math.max(
        0,
        Math.ceil((deadline.current - Date.now()) / 1000),
      );
      setRemaining(left);
      setRunning(false);
      if (!left && !ended.current) {
        ended.current = true;
        callback.current();
      }
    },
    reset: (seconds: number, start = false) => {
      ended.current = false;
      setRemaining(seconds);
      deadline.current = Date.now() + seconds * 1000;
      setRunning(start);
    },
  };
}
