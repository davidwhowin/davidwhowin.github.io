# Nova Drop sound credits

All sampled sounds are **CC0 1.0 (public domain)**, by Kenney (www.kenney.nl).
No attribution is required; we credit them anyway. Every tonal layer, the
fanfares, the music bed and the sub-bass are synthesized at runtime in
`src/platform/audio.js` (no files).

The game ships one sprite, `nova-sfx.ogg` (Vorbis) plus `nova-sfx.wav` (PCM, for Safari; artifacts cannot serve .m4a).
Each slot was trimmed of leading silence, cut short, faded out and peak-normalized
to -1 dBFS (ffmpeg). Slot offsets are in `SPRITE` in `src/platform/audio.js`.

| Slot | Original file | Pack (official download page) | License |
|---|---|---|---|
| plop1 | `Audio/drop_002.ogg` | Interface Sounds: https://kenney.nl/assets/interface-sounds | CC0 1.0 |
| plop2 | `Audio/drop_003.ogg` | Interface Sounds: https://kenney.nl/assets/interface-sounds | CC0 1.0 |
| pop1 | `Audio/pluck_001.ogg` | Interface Sounds: https://kenney.nl/assets/interface-sounds | CC0 1.0 |
| pop2 | `Audio/pluck_002.ogg` | Interface Sounds: https://kenney.nl/assets/interface-sounds | CC0 1.0 |
| tink1 | `Audio/glass_002.ogg` | Interface Sounds: https://kenney.nl/assets/interface-sounds | CC0 1.0 |
| tap1 | `Audio/select_001.ogg` | Interface Sounds: https://kenney.nl/assets/interface-sounds | CC0 1.0 |
| tap2 | `Audio/click_003.ogg` | Interface Sounds: https://kenney.nl/assets/interface-sounds | CC0 1.0 |
| thud1 | `Audio/impactSoft_medium_000.ogg` | Impact Sounds: https://kenney.nl/assets/impact-sounds | CC0 1.0 |
| thud2 | `Audio/impactSoft_medium_002.ogg` | Impact Sounds: https://kenney.nl/assets/impact-sounds | CC0 1.0 |
| boom1 | `Audio/impactSoft_heavy_000.ogg` | Impact Sounds: https://kenney.nl/assets/impact-sounds | CC0 1.0 |
| boom2 | `Audio/impactSoft_heavy_001.ogg` | Impact Sounds: https://kenney.nl/assets/impact-sounds | CC0 1.0 |
| tink2 | `Audio/impactGlass_light_001.ogg` | Impact Sounds: https://kenney.nl/assets/impact-sounds | CC0 1.0 |
| chip1 | `Audio/chips-collide-2.ogg` | Casino Audio: https://kenney.nl/assets/casino-audio | CC0 1.0 |
| chip2 | `Audio/chip-lay-1.ogg` | Casino Audio: https://kenney.nl/assets/casino-audio | CC0 1.0 |

License text (from each pack's `License.txt`): Creative Commons Zero, CC0,
http://creativecommons.org/publicdomain/zero/1.0/
