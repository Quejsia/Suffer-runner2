# SHORE DASH — 3D asset generation brief

This branch uses procedural low-poly fallback meshes so the game remains playable before external 3D assets are available. The runtime is already wired to replace those fallbacks when these GLB files exist:

- `assets/models/player.glb`
- `assets/models/rock.glb`
- `assets/models/log.glb`
- `assets/models/crab.glb`
- `assets/models/jellyfish.glb`

## Tripo 3D prompts

### Player — `player.glb`
Create an original stylized low-poly tropical beach surfer character for a third-person endless runner. Young adult proportions, dark tousled hair, blue short-sleeve shirt, dark shorts, bare feet, dynamic surfing stance on a small red-orange surfboard. Bright friendly game-ready materials, clean silhouette, no text, no logos, separate limbs, centered origin, forward-facing along the board, optimized for real-time mobile WebGL.

### Rock — `rock.glb`
Create a stylized low-poly coastal boulder obstacle. Rounded irregular dark gray stone, a few faceted planes, wet/ocean edge feel, no text, game-ready topology, centered origin, optimized for a mobile endless runner.

### Log — `log.glb`
Create a stylized low-poly driftwood log obstacle, weathered brown wood, rounded ends, a few visible cracks and knots, clean readable silhouette, no text, centered origin, optimized for mobile WebGL.

### Crab — `crab.glb`
Create a stylized low-poly tropical red beach crab obstacle. Compact body, visible claws, six simple legs, expressive but not scary, clean silhouette, centered origin, optimized for mobile WebGL. No text or logos.

### Jellyfish — `jellyfish.glb`
Create a stylized low-poly translucent purple-blue jellyfish obstacle for a tropical surf runner. Rounded bell, simple dangling tentacles, soft emissive glow, readable silhouette, no text or logos, centered origin, optimized for mobile WebGL.

## Integration rule
Keep generated assets visually consistent: simplified geometry, saturated beach colors, readable silhouettes, modest polygon counts, and no copyrighted characters or branded elements. The game automatically falls back to procedural meshes if a GLB is unavailable.
