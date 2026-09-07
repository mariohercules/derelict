# Arte da baia criogênica — 5 de setembro de 2026

Produção com a ferramenta integrada `image_gen` (skill `imagegen`). Direção: continuidade dos metais gastos, luz prática e condensação da abertura. Os arquivos são fundos decorativos; textos, estados e puzzles continuam no HTML. A fotografia de Okafor e seu vídeo originais foram preservados.

## Arquivos

| Estado | PNG gerado | Arquivo de produção |
| --- | --- | --- |
| Sem energia | `exec-ce135b43-b6e3-4484-9a90-ddf1c68370f2.png` | `src/assets/cryo-room-offline.webp` |
| Energizada, porta fechada | `exec-c2af0651-e474-4dd4-a134-03c62c3f7388.png` | `src/assets/cryo-room-powered.webp` |
| Energizada, porta aberta | `exec-424af149-038f-4712-8e27-54f898f7c0c2.png` | `src/assets/cryo-room-open.webp` |
| Gabinete | `exec-ec0fc5ca-64ed-43c3-920d-7acff47da60d.png` | `src/assets/cryo-cabinet.webp` |

Os originais estão em `/Users/mario/.codex/generated_images/01a06ec8-8e92-7a13-8cb2-739710334fea/`. A primeira imagem usou `src/assets/opening-cryo.webp` como referência visual; a energizada editou a primeira, a porta aberta editou a energizada, e o gabinete usou a energizada como referência de materiais. Todos os resultados foram inspecionados visualmente.

As salas têm 1672 × 941 px. Conversão local com `cwebp -q 85 -m 6`; versões `-small.webp` de 960 px com `-q 82 -resize 960 0 -m 6`. Gabinete de 1100 px com `-q 84 -resize 1100 0 -m 6`. Nenhuma API externa nem dependência de execução nova.

As três imagens são montadas juntas para permitir transições imediatas entre estados. Em até 900 px, `picture/srcset` permite ao navegador escolher a versão de 960 px de acordo com a densidade de tela. A energia e a porta consultam somente `auxPower` e `doors.cryo_exit`; nenhuma resposta secreta é representada na arte. O modo discreto e a preferência do sistema removem movimento e transições.

## Prompts finais

### 1. Sala sem energia

Use case: photorealistic-natural. Asset type: production background plate for a playable science fiction escape-room compartment. The reference establishes the existing game's cryopod materials and lighting; generate a NEW WIDER SHOT in the same physical world, not the original close-up.
Landscape 16:9, 1920x1080-style detailed photographic film set realism. Camera from standing eye height, facing the far wall squarely, 28mm lens, enough distance to see the entire small abandoned cryogenic bay and floor. Extremely convincing tactile worn dark olive steel, chipped pale enamel, rubber seals, heavy conduit, fastening bolts, dark reflective grated floor, traces of moisture and cold vapor. Cinematic but readable, no crushed black.
STRICT spatial composition for game interaction: left third at x=22% an EMPTY OPEN cryopod matching the reference, upright at a slight recline, lid raised off to the left, visible empty padded berth, frost along rim. Center at x=51% a square wall-mounted maintenance cabinet with a deeply recessed dark inspection face, subtle densely packed industrial hardware too small to read, no recognizable switch positions or gauges; its center is y=49%. Right third at x=81% a CLOSED full-height thick double-leaf industrial bulkhead door with a clear central seam and a chamfered rectangular frame, its center y=50%. All three objects fully visible and well separated. Keep the bottom 22% mostly clear floor for small HTML interaction labels. Keep ceiling machinery interesting and photoreal.
State: auxiliary power OFF. Dim amber practical emergency light gives warm edges to metal; soft cold residual illumination on open pod. Ceiling strip lights are unlit. Only a tiny amber door indicator. Low pale vapor at the floor and pod base. Door remains closed. Ominous quiet, vulnerable, human scale.
The entire image is only a photographic environment, no interface overlays, no writing, numbers, printed labels, arrows, logos or readable text, no people, no dead bodies, no monsters, no floating elements. No illustration, no vector outlines, no glossy futuristic white lab, no blue neon, no lens flare. Maintain believable physical geometry. This same shot will later be relit and the right door opened without changing camera or object locations.

### 2. Energia restaurada

Use case: lighting-weather. Edit target: this exact cryogenic bay production background plate. Change ONLY the room's lighting to AUXILIARY POWER RESTORED. Keep the camera, crop, geometry, open empty pod at left, central cabinet, and CLOSED bulkhead at right exactly aligned. The ceiling strip lights now glow softly in warm ivory with a slight desaturated green cast, illuminating the metal surfaces and casting realistic floor reflections. Shadows remain cinematic, but the chamber is visibly brighter and more alive than the dim amber emergency-only original. The amber lock indicator on the CLOSED right door remains amber, because unlocking is a separate state. Retain the pod's open lid, empty interior, material wear, all pipes and bolts. Less floor vapor. No new objects, no text, no interface, no people. Do not open the door.

### 3. Porta aberta

Use case: precise-object-edit. Edit target: this exact powered cryogenic bay background. Change ONLY the right-hand bulkhead door at x=81% from closed to fully OPEN: its two heavy sliding leaves have retracted into the sides of the existing door frame, exposing a deep empty industrial corridor with the same worn construction, dim ivory ceiling lighting and distant warm amber light. Change the small lock indicator beside that door from amber to soft green. Keep the entire rest of the room EXACTLY aligned and visually unchanged: same camera, crop, dimensions, ceiling illumination, left OPEN EMPTY cryopod and lid, central maintenance cabinet, pipes, bolts, floor reflections and color balance. Nothing should move except the door leaves. No text, arrows, labels, UI, people or new objects. The open passage is the only destination.

### 4. Gabinete

Use case: precise-object-edit / production texture plate. Use the attached powered cryogenic room as material reference. Generate a frontal close-up of its central auxiliary maintenance cabinet, for live HTML controls to be mounted on top. Landscape 4:3 composition. A thick battered dark olive metal frame, silver wear on edges, inset screws at four corners, rubber gasket, traces of grime. Narrow outer edges show a few bundled wires and conduit in shadow. The central 78% of the image is a single PLAIN EMPTY flat recessed dark charcoal metal mounting face with subtle scratches, almost uniform and dark enough for readable interface text. No knobs, switches, gauges, holes, screens, cables or components inside this central empty mounting face. Rich realistic photographic material on the frame. Straight-on orthographic-like camera, symmetrical mounting surface, no perspective skew. Match cinematic physical materials of the reference. No text, no symbols, no numbers, no UI, no logos, no people.
