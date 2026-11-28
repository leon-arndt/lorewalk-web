import type { Translations } from './types'

// The name of a creature type. A type is a POI category, as on the map pins
// (mapPoiPins.ts) and the companions (mapCharacters.ts).
export const CATEGORY_LABEL: Record<string, keyof Translations> = {
  heritage: 'category_heritage',
  landmark: 'poi_landmark',
  arts: 'category_arts',
  religious: 'category_religious',
  museum: 'category_museum',
  nature: 'category_nature',
}
