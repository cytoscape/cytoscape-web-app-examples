
const __mfCacheGlobalKey = "__mf_module_cache__";
globalThis[__mfCacheGlobalKey] ||= { share: {}, remote: {} };
globalThis[__mfCacheGlobalKey].share ||= {};
globalThis[__mfCacheGlobalKey].remote ||= {};
const __mfModuleCache = globalThis[__mfCacheGlobalKey];

const __mfImport = (src) =>
  globalThis.System && typeof globalThis.System.import === 'function'
    ? globalThis.System.import(src)
    : import(src);


(async () => {
  const __mfHostInit = await __mfImport("./hostInit-DbK0pd2Q.js");
  await __mfHostInit.__tla;
  const { initHost } = __mfHostInit;
  
  const runtime = await initHost();
  const __mfPreloadRemote = (remote) => {
    const pendingKey = "__mf_pending__" + remote;
    if (!__mfModuleCache.remote[pendingKey]) {
      __mfModuleCache.remote[pendingKey] = runtime.loadRemote(remote)
        .then((mod) => {
          __mfModuleCache.remote[remote] = mod;
          delete __mfModuleCache.remote[pendingKey];
          return mod;
        })
        .catch((error) => {
          delete __mfModuleCache.remote[pendingKey];
          throw error;
        });
    }
    return __mfModuleCache.remote[pendingKey];
  };
  const __mfRemotePreloads = [__mfPreloadRemote("cyweb/ApiTypes"),__mfPreloadRemote("cyweb/AppIdContext"),__mfPreloadRemote("cyweb/ElementApi"),__mfPreloadRemote("cyweb/EventBus"),__mfPreloadRemote("cyweb/ExportApi"),__mfPreloadRemote("cyweb/LayoutApi"),__mfPreloadRemote("cyweb/NetworkApi"),__mfPreloadRemote("cyweb/SelectionApi"),__mfPreloadRemote("cyweb/TableApi"),__mfPreloadRemote("cyweb/ViewportApi"),__mfPreloadRemote("cyweb/VisualStyleApi"),__mfPreloadRemote("cyweb/WorkspaceApi")];
  await Promise.allSettled(__mfRemotePreloads);
})().then(() => __mfImport("./index-FvSqcG4U.js"));
