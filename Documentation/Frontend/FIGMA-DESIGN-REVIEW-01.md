# MarketLink — Figma design review 01

Status: INCOMPLETE — Figma Starter-plan MCP tool-call limit blocked screen composition.

File: https://www.figma.com/design/nfuWvcZqiyiAOBoLHiS6A2

## Saved successfully

- Three pages: Design system, Desktop journeys, Mobile journeys. Starter allows three pages; sections will group content within them.
- 49 scoped variables with CSS code syntax: 15 primitive colours, 16 semantic colour aliases, 18 spacing/radius tokens.
- Nine text styles: Display, H1, H2, H3, Body, Small, Label, Caption, Metric.
- One effect style: ML/Overlay.
- Newsreader Regular/Medium and Public Sans Regular/Medium/SemiBold availability verified.

No representative screens, component sets, images or prototype interactions have been created yet. The attempted cover/foundations composition call was rejected by the tool quota. Do not describe this file as a complete design.

## Intended design scope

Homepage/discovery; Living Market Map; catalogue and product detail; seller-grouped basket; customer Market Day; farmer Weekly Market Planner; administrator Command Centre; three role-aware Copilot panels; mobile discovery, ordering and pickup; relevant loading, empty, error, disabled and confirmation states.

Use clearly marked fictional design fixtures. Currency, location, dates, stock and prices are illustrative until approved. Order labels must use SRS terminology and do not establish final API enums. Maps must be marked schematic until a provider and actual geography are approved. Real production content must come from authorised backend records.

## API boundary

## Foundation contrast check

Calculated sRGB contrast ratios: ink on paper 13.69:1; white on forest 12.36:1; secondary text on paper 5.67:1; error text on error surface 5.88:1. Harvest on paper is 2.83:1 and sage on paper is 1.99:1: use these for supporting fills/decoration, not ordinary text or essential low-contrast boundaries. Final composed-screen accessibility remains untested because the screens are not created.

## API integration dependencies

The ZIP's proposed API contract was reviewed and remains DRAFT. Final authentication, dated offers, seller/order grouping, pickup/cutoff rules, order transitions, validation/conflict shapes and AI action schemas are unresolved. Presentational components should accept approved view models through the central API boundary; do not embed URLs, raw API JSON, guessed state enums or server calculations into design components.

## Candidate image sources (not uploaded yet)

- fr0ggy5, harvest basket: https://unsplash.com/photos/D80mU0JCEes
- Kate Asplin, market vegetables: https://unsplash.com/photos/Kljrykekuwo
- Mustafa Akın, tomatoes: https://unsplash.com/photos/-Hpx8dtEoSo
- Nick Fewings, carrots: https://unsplash.com/photos/d9gDUaDpnes

Search results identified these as free Unsplash photographs. Recheck the current licence and source pages before final asset adoption; the licence-page retrieval returned HTTP 429. Images are editorial references, not depictions of the fictional fixture farmers.

## Resume ledger

```json
{
  "fileKey": "nfuWvcZqiyiAOBoLHiS6A2",
  "pages": [
    {
      "id": "0:1",
      "name": "01 Design system"
    },
    {
      "id": "2:68",
      "name": "02 Desktop journeys"
    },
    {
      "id": "2:69",
      "name": "03 Mobile journeys"
    }
  ],
  "tokens": {
    "createdNodeIds": [],
    "collections": [
      {
        "id": "VariableCollectionId:2:2",
        "name": "ML / Primitives",
        "modes": [
          {
            "name": "Value",
            "modeId": "2:0"
          }
        ],
        "count": 15
      },
      {
        "id": "VariableCollectionId:2:3",
        "name": "ML / Semantic",
        "modes": [
          {
            "name": "Light",
            "modeId": "2:1"
          }
        ],
        "count": 16
      },
      {
        "id": "VariableCollectionId:2:4",
        "name": "ML / Geometry",
        "modes": [
          {
            "name": "Value",
            "modeId": "2:2"
          }
        ],
        "count": 18
      }
    ],
    "variables": {
      "raw/forest": "VariableID:2:5",
      "raw/forestDeep": "VariableID:2:6",
      "raw/paper": "VariableID:2:7",
      "raw/white": "VariableID:2:8",
      "raw/ink": "VariableID:2:9",
      "raw/muted": "VariableID:2:10",
      "raw/sage": "VariableID:2:11",
      "raw/sagePale": "VariableID:2:12",
      "raw/harvest": "VariableID:2:13",
      "raw/border": "VariableID:2:14",
      "raw/danger": "VariableID:2:15",
      "raw/dangerPale": "VariableID:2:16",
      "raw/focus": "VariableID:2:17",
      "raw/map": "VariableID:2:18",
      "raw/river": "VariableID:2:19",
      "color/surface": "VariableID:2:20",
      "color/panel": "VariableID:2:21",
      "color/text": "VariableID:2:22",
      "color/secondary": "VariableID:2:23",
      "color/primary": "VariableID:2:24",
      "color/primaryHover": "VariableID:2:25",
      "color/inverse": "VariableID:2:26",
      "color/soft": "VariableID:2:27",
      "color/accent": "VariableID:2:28",
      "color/border": "VariableID:2:29",
      "color/error": "VariableID:2:30",
      "color/errorSurface": "VariableID:2:31",
      "color/focus": "VariableID:2:32",
      "color/map": "VariableID:2:33",
      "color/river": "VariableID:2:34",
      "color/sage": "VariableID:2:35",
      "space/0": "VariableID:2:36",
      "space/4": "VariableID:2:37",
      "space/8": "VariableID:2:38",
      "space/12": "VariableID:2:39",
      "space/16": "VariableID:2:40",
      "space/20": "VariableID:2:41",
      "space/24": "VariableID:2:42",
      "space/32": "VariableID:2:43",
      "space/40": "VariableID:2:44",
      "space/48": "VariableID:2:45",
      "space/64": "VariableID:2:46",
      "space/80": "VariableID:2:47",
      "radius/0": "VariableID:2:48",
      "radius/4": "VariableID:2:49",
      "radius/8": "VariableID:2:50",
      "radius/12": "VariableID:2:51",
      "radius/24": "VariableID:2:52",
      "radius/999": "VariableID:2:53"
    },
    "styles": {
      "Display": "S:065e8400af6e9099ad95e4c86faf04cb522a4256,",
      "H1": "S:9d9248db4ab64dd47a8ff14b6bc4247e6b4cc91a,",
      "H2": "S:93aa70c91b6c461755736b1683158590d6590bb9,",
      "H3": "S:1ebc9d8bf7b833c8b9fcdf6dfa187322e45e6b02,",
      "Body": "S:f8300f58454118fe1cf4932ae09f78d79cdd4fd5,",
      "Small": "S:26d8d64be7c2270a800711cd0005eb4f05927987,",
      "Label": "S:c1e2b583c211bd33aa249e1e04af21614b6c77cb,",
      "Caption": "S:eb6ca249d9d576474c32b17db9d9f8535169c048,",
      "Metric": "S:930f8f749af08d4ad22696664e6719f5e8138ae9,"
    },
    "effectId": "S:65edc47a606ee95cd84fadbdc7146ce4df4329e8,"
  },
  "lastSuccessfulPhase": "Foundations and page structure",
  "blockedCall": "Cover, specimen board and imagery holders",
  "screensCreated": 0
}
```

No application code, backend files, shared contract, branch merges or pushes were changed by this design task.
