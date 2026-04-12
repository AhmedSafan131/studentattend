import { Online, Offline } from "react-detect-offline";
import toast, { Toaster } from "react-hot-toast";
import { useEffect } from "react";

export default function NetworkStatus() {
  useEffect(() => {
    const showOffline = () => {
      toast.error("لا يوجد اتصال انترنت برجاء الاتصال بلشبكه", {
        duration: 4000,
      });
    };

    const showOnline = () => {
      toast.success("تم استرجاع الاتصال بلأنترنت", {
        duration: 3000,
      });
    };

    // react-detect-offline gives us components, not hooks
    // we handle it via event listeners too
    window.addEventListener("offline", showOffline);
    window.addEventListener("online", showOnline);

    return () => {
      window.removeEventListener("offline", showOffline);
      window.removeEventListener("online", showOnline);
    };
  }, []);

  return (
    <>
      <Online>{/* nothing needed, toast handles messages */}</Online>
      <Offline>{/* nothing needed, toast handles messages */}</Offline>
    </>
  );
}
