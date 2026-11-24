import { setWorkerUrl } from 'maplibre-gl'
import workerUrl from 'maplibre-gl/dist/maplibre-gl-worker.mjs?worker&url'

// MapLibre 6 looks for its worker file next to its own module. A bundler moves
// the module, so the lookup fails and no tile loads. Vite bundles the worker
// here and MapLibre gets the real URL.
setWorkerUrl(workerUrl)
