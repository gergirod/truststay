# Destination Refresh Runbook (Argentina, Uruguay, Brazil)

Use this guide to refresh newly added surf destinations one by one in GitHub Actions and to fix country/geocoding drift when a destination appears in the wrong place.

## Workflow to run

- Workflow: `Refresh Destination`
- Inputs:
  - `activity`: `surf`
  - `structural`: `true`
  - `dry_run`: `false`
- Run each `city_slug` below in a separate workflow run.

## New destinations to refresh

### Argentina

- `chapadmalal` (Chapadmalal)
- `quequen` (Quequen)
- `miramar` (Miramar)
- `necochea` (Necochea)
- `pinamar` (Pinamar)
- `villa-gesell` (Villa Gesell)
- `santa-clara-del-mar` (Santa Clara del Mar)
- `mar-de-ajo` (Mar de Ajo)

### Uruguay

- `punta-del-este` (Punta del Este)
- `la-pedrera` (La Pedrera)
- `jose-ignacio` (Jose Ignacio)
- `piriapolis` (Piriapolis)
- `aguas-dulces` (Aguas Dulces)
- `cabo-polonio` (Cabo Polonio)
- `punta-colorada` (Punta Colorada)
- `punta-negra-uruguay` (Punta Negra)

### Brazil

- `maresias` (Maresias)
- `guaruja` (Guaruja)
- `garopaba` (Garopaba)
- `imbituba` (Imbituba)
- `torres-rs` (Torres)
- `bombinhas` (Bombinhas)

## How to fix country/geocoding drift with GitHub Action

If a destination shows in the wrong country or far from its real coast:

1. Add or tighten its geocode hint in `src/lib/destinationGeocode.ts` under `GEOCODE_QUERY_BY_SLUG`.
   - Use a specific query format like: `City, Region/State, Country`.
   - Example: `Playa Gigante, Rivas, Nicaragua`.
2. If needed, add matching disambiguation in `src/app/city/[slug]/page.tsx` resolve hints (for consistency in city resolution paths).
3. Commit and push those code changes.
4. Run `Refresh Destination` for the affected slug:
   - `activity=surf`
   - `structural=true`
   - `dry_run=false`
5. Verify after run completes:
   - Landing map pin is in correct area/country.
   - Country cluster grouping is correct.
   - City page opens with expected destination name/country.
6. If still wrong, make the geocode query even more specific (province/county + country), then rerun the same slug.

## Notes

- The homepage map now has a drift safeguard (`src/app/page.tsx`) that falls back to trusted coordinates when DB anchors are clearly off. This protects UX immediately, but running the refresh workflow is still required to fix canonical DB anchors permanently.
- Always prefer canonical slugs and country names from `src/data/activityDestinations.ts`.
