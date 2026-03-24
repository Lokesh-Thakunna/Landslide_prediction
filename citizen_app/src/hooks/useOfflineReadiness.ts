import { useCallback, useEffect, useMemo, useRef, useState } from "react";

type OfflineCacheState = "idle" | "preparing" | "ready" | "error";

type ServiceWorkerStatusMessage = {
  type: "OFFLINE_CACHE_STATUS";
  districtId?: string;
  status: OfflineCacheState;
  cachedDistrictIds?: string[];
  message?: string;
};

const OFFLINE_DISTRICTS_STORAGE_KEY = "hhlews-offline-districts";

function normalizeDistrictId(value: string | null | undefined) {
  if (!value) {
    return null;
  }

  return value.trim().toLowerCase().replace(/-/g, "_");
}

function readStoredDistricts() {
  if (typeof window === "undefined") {
    return [];
  }

  try {
    const raw = window.localStorage.getItem(OFFLINE_DISTRICTS_STORAGE_KEY);
    if (!raw) {
      return [];
    }

    const parsed = JSON.parse(raw) as unknown;
    if (!Array.isArray(parsed)) {
      return [];
    }

    return parsed
      .map((item) => (typeof item === "string" ? normalizeDistrictId(item) : null))
      .filter((item): item is string => Boolean(item));
  } catch {
    return [];
  }
}

export function useOfflineReadiness(districtId: string | null | undefined) {
  const [isOnline, setIsOnline] = useState(() =>
    typeof navigator === "undefined" ? true : navigator.onLine
  );
  const [serviceWorkerReady, setServiceWorkerReady] = useState(false);
  const [cacheState, setCacheState] = useState<OfflineCacheState>("idle");
  const [cacheMessage, setCacheMessage] = useState<string | null>(null);
  const [cachedDistrictIds, setCachedDistrictIds] = useState<string[]>(() =>
    readStoredDistricts()
  );

  const registrationRef = useRef<ServiceWorkerRegistration | null>(null);
  const autoRequestedDistrictsRef = useRef<Set<string>>(new Set());

  const currentDistrictId = useMemo(() => normalizeDistrictId(districtId), [districtId]);
  const serviceWorkerSupported =
    typeof window !== "undefined" && typeof navigator !== "undefined" && "serviceWorker" in navigator;
  const cachedCurrentDistrict = currentDistrictId
    ? cachedDistrictIds.includes(currentDistrictId)
    : false;

  useEffect(() => {
    if (typeof window === "undefined") {
      return;
    }

    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);

    window.addEventListener("online", handleOnline);
    window.addEventListener("offline", handleOffline);

    return () => {
      window.removeEventListener("online", handleOnline);
      window.removeEventListener("offline", handleOffline);
    };
  }, []);

  useEffect(() => {
    if (typeof window === "undefined") {
      return;
    }

    window.localStorage.setItem(
      OFFLINE_DISTRICTS_STORAGE_KEY,
      JSON.stringify(cachedDistrictIds)
    );
  }, [cachedDistrictIds]);

  useEffect(() => {
    if (!serviceWorkerSupported) {
      setCacheMessage("Offline app caching is not supported on this browser.");
      return;
    }

    let disposed = false;

    const handleMessage = (event: MessageEvent<ServiceWorkerStatusMessage>) => {
      const payload = event.data;
      if (!payload || payload.type !== "OFFLINE_CACHE_STATUS") {
        return;
      }

      setCacheState(payload.status);
      setCacheMessage(payload.message ?? null);

      if (payload.cachedDistrictIds?.length) {
        setCachedDistrictIds((current) => {
          const merged = new Set(current);
          for (const district of payload.cachedDistrictIds ?? []) {
            const normalized = normalizeDistrictId(district);
            if (normalized) {
              merged.add(normalized);
            }
          }
          return Array.from(merged);
        });
      }
    };

    navigator.serviceWorker.addEventListener("message", handleMessage);

    void navigator.serviceWorker
      .register("/sw.js")
      .then(async (registration) => {
        if (disposed) {
          return;
        }

        registrationRef.current = registration;
        await navigator.serviceWorker.ready;

        if (!disposed) {
          setServiceWorkerReady(true);
          if (!cachedDistrictIds.length) {
            setCacheMessage("Offline shell is ready. District guidance will cache automatically.");
          }
        }
      })
      .catch(() => {
        if (!disposed) {
          setCacheState("error");
          setCacheMessage("Offline caching could not be started on this device.");
        }
      });

    return () => {
      disposed = true;
      navigator.serviceWorker.removeEventListener("message", handleMessage);
    };
  }, [cachedDistrictIds.length, serviceWorkerSupported]);

  const prepareOffline = useCallback(
    async (requestedDistrictId?: string | null) => {
      const targetDistrictId = normalizeDistrictId(requestedDistrictId ?? currentDistrictId);

      if (!targetDistrictId) {
        setCacheState("error");
        setCacheMessage("Choose a zone before preparing offline guidance.");
        return;
      }

      if (!serviceWorkerSupported) {
        setCacheState("error");
        setCacheMessage("Offline app caching is not supported on this browser.");
        return;
      }

      if (cachedDistrictIds.includes(targetDistrictId)) {
        setCacheState("ready");
        setCacheMessage("Offline guidance is already cached for this district.");
        return;
      }

      setCacheState("preparing");
      setCacheMessage("Preparing offline guidance for this district...");

      const registration =
        registrationRef.current ??
        (await navigator.serviceWorker.ready.catch(() => null));

      if (!registration) {
        setCacheState("error");
        setCacheMessage("Offline caching is not ready yet. Try again in a moment.");
        return;
      }

      const worker =
        registration.active ?? registration.waiting ?? registration.installing ?? null;

      if (!worker) {
        setCacheState("error");
        setCacheMessage("Offline worker is still starting. Try again in a moment.");
        return;
      }

      worker.postMessage({
        type: "PRECACHE_DISTRICT",
        districtId: targetDistrictId,
      });
    },
    [cachedDistrictIds, currentDistrictId, serviceWorkerSupported]
  );

  useEffect(() => {
    if (!currentDistrictId || !serviceWorkerReady || cachedDistrictIds.includes(currentDistrictId)) {
      if (currentDistrictId && cachedDistrictIds.includes(currentDistrictId)) {
        setCacheState("ready");
      }
      return;
    }

    if (autoRequestedDistrictsRef.current.has(currentDistrictId)) {
      return;
    }

    autoRequestedDistrictsRef.current.add(currentDistrictId);
    void prepareOffline(currentDistrictId);
  }, [cachedDistrictIds, currentDistrictId, prepareOffline, serviceWorkerReady]);

  return {
    isOnline,
    serviceWorkerSupported,
    serviceWorkerReady,
    cacheState,
    cacheMessage,
    cachedCurrentDistrict,
    prepareOffline,
  };
}
