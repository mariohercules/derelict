# Engenharia — panorama temático

Arte produzida com a ferramenta integrada image_gen, usando a baia como referência de materiais e direção de arte. Sem Three.js ou dependências novas.

Arquivos finais:
- `src/assets/engineering-room.webp`: 1672 × 941, 237,75 kB.
- `src/assets/engineering-room-small.webp`: 960 px de largura, 82,17 kB.

A imagem substitui a ilustração decorativa das turbinas; os instrumentos de fusível/refrigeração e engrenagens/bobinas permanecem nos componentes existentes. Atalhos levam o foco e a rolagem às estações. A energia e a legenda usam o estado real do jogo. Uma camada de luz CSS acompanha motores online e uma névoa discreta respeita movimento reduzido. A arte é decorativa: a autorização da passagem continua expressa pelo controle HTML. Não há animação de peças dentro da fotografia ou nova mecânica.

## Prompt final

Use case: stylized-concept. Asset type: cinematic photorealistic background plate for engineering compartment of DERELICT browser game. Reference image is STYLE AND MATERIAL reference only, not edit target. Generate a NEW landscape 16:9 film still in a DIFFERENT ROOM of the same abandoned industrial spacecraft. Eye-level 24mm lens, monumental paired sealed turbine housings dominate center-left, heavy coolant pipes and flanges overhead, a maintenance console with CLOSED blank metal front on left, on right a steep ladder ascending to a CLOSED ceiling hatch. Deep catwalk perspective between machinery. No cryopod. Practical worn olive-gray steel, oil stains, chipped paint, brass fittings, subtle haze, dim warm maintenance lamps and pale overhead light, restrained cinematic contrast with legible machine silhouettes. Engines are OFFLINE: turbine housings opaque, no visible rotating blades, no internal glow, no bright status indicators. Grated foreground floor with slight oily reflections occupies lower 20 percent. No people, no text, no labels, no gauges, no readable numbers, no symbols, no UI, no watermarks. Real physical set photography, believable scale, finely detailed materials, ominous silence. Output one finished background image.

Referência: `src/assets/cryo-room-powered.webp`. Original gerado: `/Users/mario/.codex/generated_images/01a06ec8-8e92-7a13-8cb2-739710334fea/exec-28029975-cf4b-4f13-84e0-d1bf9f09b699.png`. Conversão WebP com cwebp, qualidades 84 e 80, sem alteração artística.

## Validação

354 testes em 32 arquivos passaram. TypeScript e build de produção aprovados. JS principal 490,96 kB / 152,45 kB gzip. CSS 50,75 kB / 11,78 kB gzip.

Navegador: partida existente retomada na engenharia; arte carregada, atalhos transferindo foco aos três destinos, controles existentes visíveis. Conferência em 1280, 390 e 320 px, sem overflow horizontal; alvos dos atalhos com pelo menos 60 px de altura. Console sem erros ou avisos. Viewport restaurado. Não houve alteração do estado dos puzzles, teste de todas as variantes no navegador ou playthrough integral nesta etapa.
