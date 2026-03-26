# Place Confidence System Spec

## Purpose
Trustay must not pretend to know more than the data supports.
Each place card should communicate a small set of **confidence-based signals**.

## Signals to show
For cafes and coworkings:
- workFit
- noiseRisk
- wifiConfidence
- laptopFriendly
- bestFor
- explanation

For gyms:
- routineFit
- convenience
- distance support
- explanation

For food places:
- convenience
- quickMealFit
- routineSupport
- explanation

## Allowed values

### workFit
- low
- medium
- high

### noiseRisk
- low
- medium
- high
- unknown

### wifiConfidence
- weak
- medium
- verified
- unknown

### laptopFriendly
- yes
- likely
- mixed
- unknown

### routineFit
- low
- medium
- high

### convenience
- low
- medium
- high

## bestFor tags
Allowed tags:
- quick_stop
- backup_work
- deep_work
- calls
- short_session
- coffee_break
- training
- quick_meal
- routine_support

## Data sources used for confidence derivation
Phase 1 can use:
- place category/type
- rating
- review count
- opening hours if available
- distance from recommended area center
- density of surrounding relevant places

Phase 1.5 may add:
- Google review keywords
- Google review summaries
- structured verification later

## Wording rules
Never use definitive claims unless directly verified.

### Forbidden wording
- perfect for work
- guaranteed quiet
- excellent internet
- amazing wifi
- ideal for calls

### Preferred wording
- likely good for short work sessions
- internet not verified
- quieter signal appears stronger than average
- good backup option
- better for backup than deep work
- noise may vary

## Explanation style
Each place should include one short explanation line.
Examples:
- Popular café with decent work signals, but internet is not verified.
- Strong backup option based on coworking category and proximity.
- Convenient gym near the suggested base area, useful for a steady routine.

## Confidence interpretation rules

### Cafes
A cafe should usually default to:
- workFit: medium
- noiseRisk: unknown or medium
- wifiConfidence: unknown or weak

Only raise confidence when supporting signals are stronger.

### Coworkings
A coworking can start with a stronger workFit prior because the category itself is a work-oriented venue.
Default:
- workFit: high
- noiseRisk: medium or low
- wifiConfidence: medium

### Gyms
Do not infer equipment quality beyond general rating.
Focus on convenience and routine support.

### Food spots
Do not claim healthy or quiet unless the source supports it.
Keep food logic centered on convenience and routine support.
