# Poll City — Geodata

Ward and region boundary data for Ontario municipalities.
Used for turf cutting, map display, and candidate/voter geographic matching.

## Folder structure

```
docs/geodata/
  municipalities/
    ontario/
      whitby/        ← Whitby, ON (Region of Durham) — 4 wards
      [city]/        ← add as we grow
  regions/
    ontario/
      durham/        ← future: Durham Region boundary
```

## File formats (per municipality)

| File | Format | Projection | Use |
|---|---|---|---|
| `*-wards.geojson` | GeoJSON FeatureCollection | WGS84 (EPSG:4326) | **Primary** — Leaflet/maps, booleanPointInPolygon |
| `*-wards-shapefile/` | ESRI Shapefile | WGS84 | GIS software import |
| `*-wards.gpkg` | GeoPackage | varies | GIS software |
| `*-wards.kmz` | Google Earth KMZ | WGS84 | Google Earth / visualization |
| `*-wards.xlsx` | Excel | — | Manual reference |
| `*-wards-arcgis.json` | ArcGIS Feature Layer JSON | varies | ArcGIS source backup |
| `*-wards-metadata.json` | ArcGIS metadata JSON | — | Source metadata |

## Properties in GeoJSON features

Each ward feature includes:
- `WARD_DESC` — ward name (e.g. "North Ward")
- `WARD_TEXT` — zero-padded ward number (e.g. "01")
- `WARD` — integer ward number
- `PREFIX` — poll prefix for this ward (e.g. "010-")
- `COUNCILOR` — current councillor name
- `PHONE_NO`, `MOBILE`, `EMAIL`, `IMAGE`, `WEBSITE` — councillor contact
- `REGIONAL_COUNCILLOR` — regional councillor name + contact fields prefixed `RC_`

## Sources

- **Whitby**: [Whitby Open Data / ArcGIS](https://whitby.maps.arcgis.com) — downloaded 2026-04-20
  - 4 wards: North (01), West (02), Centre (03), East (04)
  - Councillors: Steve Lee, Matt Cardwell, Niki Lundquist, Victoria Bozinovski
  - Regional Councillors: Rhonda Mulcahy, Chris Leahy, Steve Yamada, Maleeha Shahid

## How to add a new municipality

1. Download the ward boundary GeoJSON from the municipality's open data portal or ArcGIS service
2. Confirm the GeoJSON is in WGS84 (EPSG:4326) — if not, reproject with QGIS or ogr2ogr
3. Place in `municipalities/ontario/[city-slug]/[city-slug]-wards.geojson`
4. Add source info to this README

## Platform integration (future)

- `Official.ward` / `Contact.ward` — text field matches `WARD_TEXT` or `WARD_DESC`
- Ward boundary lookup: load GeoJSON → `booleanPointInPolygon(point, feature)` from `@turf/turf`
- Turf cut by ward: filter contacts where point falls within ward polygon
- Map display: render ward polygons as Leaflet GeoJSON layer with councillor popups
