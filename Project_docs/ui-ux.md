# BHURAKSHAN UI and UX

## 1. Design Principles

- keep risk language simple
- show action before detail
- make forecast visibility obvious
- attach shelters and routes to danger states
- keep the citizen experience calmer than the operator dashboard

## 2. Risk Color System

| Level | Color | Usage |
| --- | --- | --- |
| `SAFE` | green | normal condition |
| `WATCH` | amber | increased attention |
| `DANGER` | red | immediate warning and action |

## 3. Dashboard UX

The official dashboard should include:

- a Leaflet map with colored zones
- hotspot markers for rising-risk areas
- a zone drawer with:
  - current score
  - `+1h` and `+2h` forecast cards
  - rainfall and proxy values
  - top contributing features
  - nearest shelter and route summary
- alert dispatch log
- manual alert trigger

## 4. Citizen UX

The citizen interface should prioritize:

- current risk level
- short, plain-language warning text
- forecast cards for the next two hours
- nearest safe shelter
- route summary
- emergency contacts

## 5. Copy Guidance

### Good

- `Danger expected within 1 hour. Move toward the listed shelter now.`
- `Watch level. Stay alert and avoid steep roadside edges.`

### Avoid

- unexplained model jargon
- technical proxy terminology in the citizen view
- cluttered text blocks during danger states

## 6. Mobile Behavior

- large tap targets
- clear contrast in all risk states
- a one-screen summary before secondary details

## 7. Dashboard vs Citizen Tone

### Dashboard

- analytical
- operational
- includes model explanation and trend context

### Citizen

- simple
- urgent only when needed
- focused on next action

## 8. Accessibility

- do not rely on color alone
- include text labels on every risk state
- maintain readable contrast
- keep route guidance scannable in low-stress and high-stress scenarios
