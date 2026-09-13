# SHORE DASH — Build 3D Game Rooms brief

## Reference target
Use the supplied SHORE DASH concept image as the visual direction: a tropical third-person surf runner viewed from behind the player, with a single winding water corridor, sandy banks, rocks, driftwood, palms, distant island/coastal structures, bright turquoise water, and a strong readable path silhouette.

## Room / scene layout
- Camera: third-person chase camera, slightly elevated, centered behind the surfer.
- Play space: one continuous water/surf corridor; no three-lane road markings.
- Corridor: dynamically curves, narrows, and widens.
- Banks: sand on both sides with scattered rocks, shrubs, palms, and occasional coastal props.
- Distance view: layered islands/cliffs and simple structures for depth.
- Lighting: bright tropical daylight with warm sun highlights and cool ocean fill.
- Mood: energetic, colorful, game-ready, readable at mobile resolution.

## Runtime requirement
The browser implementation in `game-3d.js` creates the same room composition procedurally and keeps GLB replacement hooks for Tripo-generated assets. This avoids blocking play-testing while externally generated assets are prepared.

## Planned room variants
1. Sunny Beach — wide, welcoming path.
2. Rocky Shore — narrower path with more rocks and driftwood.
3. Curved Coast — stronger left/right bends.
4. Storm Beach — darker sky, heavier waves, tighter visibility.
5. Night Run — moonlit water and emissive collectibles.
6. Mega Wave — special tunnel/wave section.

## Performance rules
Use simple real-time geometry, reuse/recycle path segments, cap device pixel ratio, avoid excessive dynamic shadows, and keep distant props low-detail. Mobile performance takes priority over decorative density.
