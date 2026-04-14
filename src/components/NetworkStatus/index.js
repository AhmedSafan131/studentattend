import { useEffect, useRef } from "react";

export default function NetworkStatus() {
  const lastStatusRef = useRef(typeof navigator !== "undefined" ? navigator.onLine : true);

  useEffect(() => {
    const syncStatus = () => {
      lastStatusRef.current = navigator.onLine;
    };

    window.addEventListener("online", syncStatus);
    window.addEventListener("offline", syncStatus);

    return () => {
      window.removeEventListener("online", syncStatus);
      window.removeEventListener("offline", syncStatus);
    };
  }, []);

  return null;
}
