export { buildMapStyle, type BuildStyleOptions } from "./buildStyle.js";
export { presets, getPreset, configFromPreset, type Preset } from "./presets.js";
export {
  defaultProvider,
  withProviderOverrides,
  type MapProviderConfig,
} from "./providers.js";
export {
  setupContourSource,
  DEFAULT_CONTOUR_THRESHOLDS,
  type ContourSourceHandle,
} from "./contours.js";
export { searchLocation, zoomForBoundingBox, type GeocodeResult } from "./geocode.js";
export { BUILDING_PATTERN_ID, buildWindowPatternImage, registerWindowPattern } from "./buildingPattern.js";
export { fetchRoute, type RouteResult, type RoutingProfile } from "./directions.js";
export * from "./colorUtils.js";
