# Enfermaria — arte temática

Imagem criada com a ferramenta integrada de geração de imagens. Pod vazio de tampa aberta, condensação, terminal apagado e bandeja médica. A arte não contém leituras ou pistas; a fita e o fósforo do terminal permanecem em SVG.

## Arquivos

- `src/assets/medbay-room.webp`: 1672 × 941.
- `src/assets/medbay-room-small.webp`: 960 × 540, aproximadamente 40,87 kB.
- Original: `/Users/mario/.codex/generated_images/01a06ec8-8e92-7a13-8cb2-739710334fea/exec-4248f25a-e3b3-4a09-b07c-1e23bca8e40e.png`.
- Integração em Medbay.tsx, strings.ts e theme.css.

## Prompt final

Use case: stylized-concept. Asset type: photorealistic cinematic environment panorama for DERELICT, grounded industrial spaceship mystery horror game. Wide 16:9 live action science fiction production still. Empty personal medical bay aboard an aging freighter. A single human-sized cryogenic medical pod sits slightly right of center, lid raised, empty padded interior, beads of condensation on thick glass and dull stainless steel rim. Beside it an old heavy CRT terminal completely dark, and a small stainless instrument tray with a loosely coiled plain medical wristband and a rolled paper strip, no readable markings. Thick insulated tubing, faded pale green ceramic wall panels, bolted bulkheads, a hanging task light, worn rubber flooring and narrow service passage. Cold pale clinical light through misty glass, restrained amber standby light far behind, deep tactile shadows and realistic materials, muted sage green, ivory and graphite, quiet uneasy aftermath of waking, intimate human scale. No people, no bodies, no gore, no blood, no monster, no holograms, no neon, no text, no numbers, no ECG trace, no visible clues, no logos or UI. No reading on terminal or wristband. Scenery only; evidence and readings rendered separately in code. Strong composition leading to empty pod; leave lower left darker and quiet for a caption.

## Validação

- 354 testes passaram em 32 arquivos; build aprovado. Permanece aviso de tamanho do bundle principal (504,15 kB).
- Navegador em 1280 × 720 e 320 × 740, português e inglês. Enquadramento e painéis inspecionados visualmente; sem overflow horizontal na verificação móvel.
- Atalho por Enter transfere foco à pulseira. Examinar a fita revela o marcador e o texto existente, remove o botão e atualiza o estado do jogo.
- Terminal e pistas existentes preservados. Efeitos reduzidos desativam a névoa decorativa.
- Console inspecionado sem erros/avisos. Teste em fixture temporária sem persistência; arquivos removidos e viewport restaurado. Save do usuário preservado.
- Não foi realizado percurso completo do capítulo. O recorte desktop prioriza o pod e terminal; celular mostra a imagem integral.
