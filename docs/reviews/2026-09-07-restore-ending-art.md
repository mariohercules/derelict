# Desfecho — Nave restaurada

Arte criada pela ferramenta integrada de geração de imagens: corredor da Cormorant iluminado novamente, mantendo desgaste e ausência humana. A imagem representa o estado final restaurado. A sequência convés por convés permanece na vinheta SVG abaixo do texto, com a ponte por último.

## Arquivos

- `src/assets/ending-restore.webp`: 1672 × 941.
- `src/assets/ending-restore-small.webp`: 960 × 540, aproximadamente 46,79 kB.
- Original: `/Users/mario/.codex/generated_images/01a06ec8-8e92-7a13-8cb2-739710334fea/exec-902f82a5-4b6d-4838-bc84-a0c7b099c078.png`.
- Integração em Epilogue.tsx e theme.css. Classes de layout cinematográfico compartilhadas com o final de fuga.

## Prompt final

Use case: stylized-concept. Asset type: photorealistic cinematic ending panorama for DERELICT industrial spaceship mystery game, restoration ending. Wide 16:9 live action science fiction film still. Interior of an old industrial freighter now restored to working order, viewed from a dark foreground threshold down a long axial corridor of repeating heavy steel bulkheads and overhead cable conduits. Rows of practical warm ivory ceiling lamps are all on, leading into deep perspective and a distant closed bridge pressure door. Pale sage green wall panels, graphite floor grating, brass fittings, scuffed metal and condensation, restrained green status lamps with no readable labels, faint clean atmospheric haze. Ship feels alive and orderly again but still old and scarred, bittersweet quiet, human absence, no celebratory spectacle. Strong composition with layered lit doorframes receding centrally and slightly right, soft dark lower left for text if needed. Realistic tactile production design, premium restrained cinematography, believable light falloff, no neon cyberpunk. No people, no faces, no holographic AI, no text or numbers or logos, no UI, no readable monitors, no fire or damage event, no stars indoors. The lighting in the still depicts the final restored state; compartment reactivation is shown separately in a live schematic in code.

## Validação

- 354 testes em 32 arquivos passaram; build aprovado. Aviso preexistente do bundle principal de 504,15 kB permanece; epílogo carregado sob demanda.
- Inspeção visual em 1280 × 720 e 320 × 740, português e inglês; sem overflow horizontal na verificação móvel.
- Dez compartimentos com animações escalonadas de 0,4 a 3,55 segundos; ordem protegida pelo teste existente de RESTORE_ORDER.
- Modo reduzido exibe os dez compartimentos acesos e desativa reflexo decorativo.
- Texto, estatísticas, registro de voo e botão de reinício preservados. Reinício não executado.
- Regressão de fuga: título Pod lançado, imagem ending-escape.webp e ausência da sequência de restauração confirmados.
- Console inspecionado sem erros/avisos. Fixture temporária sem persistência removida, viewport restaurado, save preservado. Não realizado percurso completo até a fusão.
