# @topolyne/react

Beautiful, terrain-aware maps designed at [topolyne.com](https://topolyne.com), embedded in your React app with one component.

Design a map in the Topolyne editor, publish it, then drop it into your app:

```bash
npm install @topolyne/react
```

```tsx
import { Map } from "@topolyne/react";

export default function Page() {
  return <Map mapId="map_Nvm9w6Wn9d" style={{ width: "100%", height: "500px" }} />;
}
```

`mapId` is the id you get back from **Publish** in the editor. The component fetches your published design, builds the matching MapLibre style (including terrain/contours when your design uses them), and stays in sync — change the design in the Topolyne dashboard and the embedded map updates without a redeploy.

## Markers

```tsx
import { Map, MapMarker } from "@topolyne/react";

<Map mapId="map_Nvm9w6Wn9d" style={{ width: "100%", height: "500px" }}>
  <MapMarker latitude={40.7128} longitude={-74.006} onClick={() => alert("Hi from NYC")} />
</Map>;
```

`<MapMarker>` must be rendered inside `<Map>`. Pass children to render your own marker element instead of the default pin.

## Reading the underlying map instance

```tsx
import { useTopolyneMap } from "@topolyne/react";

function FlyToButton() {
  const { map, loaded } = useTopolyneMap();
  if (!loaded) return null;
  return <button onClick={() => map?.flyTo({ center: [-0.1276, 51.5072], zoom: 12 })}>Fly to London</button>;
}
```

`useTopolyneMap()` must be called from a component rendered inside `<Map>`. It returns the live [MapLibre GL `Map`](https://maplibre.org/maplibre-gl-js/docs/API/classes/Map/) instance once loaded, so you can drop down to the MapLibre API for anything this package doesn't wrap directly.

## Props

| Prop | Type | Default | Description |
| --- | --- | --- | --- |
| `mapId` | `string` | — | The id from **Publish** in the Topolyne editor. Required. |
| `className` | `string` | — | Applied to the map's wrapping `div`. |
| `style` | `CSSProperties` | — | Applied to the map's wrapping `div`. The map has no intrinsic size — set a width and height here. |
| `center` | `[number, number]` | published value | Override the saved center (`[longitude, latitude]`). |
| `zoom` | `number` | published value | Override the saved zoom. |
| `pitch` | `number` | published value | Override the saved pitch. |
| `bearing` | `number` | published value | Override the saved bearing. |
| `interactive` | `boolean` | `true` | Set `false` for a static, poster-style embed. |
| `onLoad` | `(map: maplibregl.Map) => void` | — | Called once the map has loaded. |
| `provider` | `MapProviderConfig` | — | Escape hatch for pointing tile/terrain sources at a self-hosted Topolyne instance. Most apps never set this. |

## Requirements

- React 18 or later (`react` and `react-dom` are peer dependencies)
- A map published from [topolyne.com](https://topolyne.com/editor)

## Attribution

Topolyne's maps are built on [OpenFreeMap](https://openfreemap.org/) and [OpenMapTiles](https://www.openmaptiles.org/), with data from [OpenStreetMap](https://www.openstreetmap.org/copyright). `<Map>` shows the required attribution automatically — please don't remove it.

## License

MIT
