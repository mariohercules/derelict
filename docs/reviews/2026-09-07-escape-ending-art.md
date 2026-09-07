# Desfecho de fuga — Pod lançado

Arte criada com a ferramenta integrada de geração de imagens, vista de dentro da cápsula com a Cormorant distante. Não antecipa resgate ou destino dos ocupantes. Aplicada aos finais leave_knowing, leave_unknowing e ao fallback existente de final nulo.

## Arquivos

- `src/assets/ending-escape.webp`: 1672 × 941.
- `src/assets/ending-escape-small.webp`: 960 × 540, aproximadamente 22,86 kB.
- Original: `/Users/mario/.codex/generated_images/01a06ec8-8e92-7a13-8cb2-739710334fea/exec-5fc34b27-da22-4762-b89c-b2f8a1b7d17b.png`.
- Integração em Epilogue.tsx e theme.css. O módulo de epílogo já é carregado sob demanda pelo App.

## Prompt final

Use case: stylized-concept. Asset type: photorealistic cinematic ending panorama for DERELICT industrial spaceship mystery game, escape ending. Wide 16:9 live-action science fiction film still, viewpoint from inside a tiny escape capsule looking through a thick small panoramic window. In the near foreground edges: dark worn steel window frame, bolts, rubber seals, scratched glass with faint reflections from dim amber cabin lights. Outside in black space, an old elongated industrial freighter recedes far away slightly right of center, tiny compared to the void, angular utilitarian silhouette with layered cargo modules and narrow spine, a few dim navigation lamps, no visible damage or explosions. Sparse stars, cold distant light on the ship, enormous lonely distance, quiet relief mixed with uncertainty. Window fills almost all composition; black negative space on left, ship occupies less than one fifth of frame width but readable. Muted blue gray, charcoal and amber, realistic physical optics, restrained grain, textured practical production design. No humans, hands, text, letters, numbers, logos, UI, planets, nebulae, missiles, laser beams, signal beacons, rescuer or other ships. No conclusion about rescue or fate. Scenery only, outcome text rendered in code. No prominent controls or displays.

## Validação

- 354 testes passaram em 32 arquivos. Build aprovado; aviso preexistente do bundle principal de 504,15 kB permanece.
- Inspeção visual em 1280 × 720 e 320 × 740, português e inglês. Sem overflow horizontal na verificação móvel.
- Textos distintos de partida sabendo e sem saber preservados. Informações condicionais de provas e farol verificadas na variante sabendo.
- Registro de voo e botões existentes mantidos. Reinício de partida não executado durante a inspeção.
- Final restore verificado sem imagem de fuga, mantendo sua vinheta SVG. Outros finais não receberam novo visual nesta etapa.
- Reflexo decorativo desativado com efeitos reduzidos. Console inspecionado sem erros/avisos.
- Fixture temporária sem persistência removida, viewport restaurado, save preservado. Não realizado percurso completo até o final.
