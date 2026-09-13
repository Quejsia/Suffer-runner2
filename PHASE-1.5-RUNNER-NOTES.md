# SHORE DASH — Phase 1.5 / 1.5.5

## Product direction
Swipe-first, single-path **3D** mobile runner. The player has free horizontal positioning inside a continuously moving beach/surf corridor rather than fixed three-lane switching.

## Phase 1.5 goals
- Keep the canvas as the mobile control surface.
- Tap/swipe-up jump, horizontal swipe dodge, swipe-down slide.
- Preserve keyboard controls for PC.
- Remove visible mobile joystick/button clutter.
- Keep responsive portrait/landscape layout and screen-space HUD.
- Move rendering from the old 2D canvas loop to a lightweight Three.js 3D scene.

## Phase 1.5.5 goals
- Dynamic single-lane water/surf path.
- Smooth horizontal positioning with path clamping.
- Curved, narrowing, and widening corridor behavior.
- Obstacles and collectibles spawn inside the active path.
- Third-person chase camera and scrolling world.
- 3D player, rocks, driftwood, crab, and jellyfish asset hooks.
- Procedural low-poly fallbacks so the build remains playable before generated GLBs are supplied.
- Add slide state and a shorter player posture/hit profile.
- Prepare the architecture for later wave sections, dash, power-ups, and environmental events.

## 3D asset pipeline
- Tripo target assets: player, rock, log, crab, jellyfish.
- Expected runtime locations are listed in `ASSET-GENERATION-3D-BRIEF.md`.
- `game-3d.js` automatically uses a GLB when present and keeps a procedural fallback when it is not.

## 3D room direction
`BUILD-3D-GAME-ROOM-BRIEF.md` defines the scene layout based on the supplied reference: winding water corridor, sandy banks, tropical vegetation, rocks, coastal structures, chase camera, and mobile-first performance constraints.

## Next phase
Phase 2 will add dash, shields, wave events, richer obstacle combinations, power-ups, and difficulty progression after this 3D architecture is play-tested.
