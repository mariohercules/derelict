# Hidroponia — panorama temático

Arte criada com a ferramenta integrada image_gen, usando `src/assets/engineering-room.webp` como referência de materiais. Vegetação, condensação, luz de cultivo e passarela úmida introduzem um contraste orgânico com as outras salas.

Arquivos finais: `src/assets/hydro-room.webp` (1672 × 941, 191,78 kB) e `src/assets/hydro-room-small.webp` (960 px de largura, 66,10 kB). Conversão WebP com cwebp, qualidades 84 e 80. Original preservado em `/Users/mario/.codex/generated_images/01a06ec8-8e92-7a13-8cb2-739710334fea/exec-615cbcd4-d0c5-47f5-a577-a230bc19df0e.png`.

O panorama é decorativo e não contém valores ou objetos escondidos do puzzle. Atalhos transferem foco e rolagem ao coletor e ao canteiro central. O cabeçalho acompanha o último ciclo e a resolução real da irrigação; mudar uma válvula apaga a avaliação anterior pelas regras existentes. Névoa discreta respeita movimento reduzido. No celular, cada válvula ocupa uma linha e tem área de 44 px de altura. Sem Three.js ou dependências novas.

## Prompt final

Use case: stylized-concept. Asset: cinematic photorealistic 16:9 background for DERELICT hydroponics compartment. Reference image is STYLE AND MATERIAL reference only, not edit target. A NEW room on the same abandoned industrial spacecraft. Eye-level 24mm photograph looking down a narrow wet grated maintenance aisle into a deep enclosed cultivation room. Chipped olive steel, corroded brass pipe fittings, overhead cable conduits, pale utilitarian grow lights, restrained warm maintenance light. Rows of planting trays and tangled green vines framed by heavy structural ribs. A dense central mass of ordinary green climbing leaves, no alien species, surrounded by smaller surviving plants. Condensation on glass partitions, slight humid haze and droplets, roots partly obscured by planter rims. Human survival garden against a decaying machine, ominous and beautiful, legible deep composition, believable practical movie set photography, natural material details. Keep key plants and grow lights within middle horizontal half for panoramic crop. Do not show puzzle instruments, gauges, valve positions, tank levels, numbers, writing, labels, data spike, ration bag, hidden objects, people, UI or watermarks. The planting trays are background ambience, never an irrigation diagram. No view of outer space. Single finished image.

## Validação

354 testes em 32 arquivos passaram. TypeScript e build de produção aprovados: JS principal 497,36 kB / 153,82 kB gzip; CSS 62,30 kB / 13,30 kB gzip.

Em fixture temporária sem persistência de partida: orçamento excedido e ciclo recusado, configuração clássica correta, ciclo concluído, revelação e coleta do spike. Na variante de sonda: ciclo com linhas fechadas, indicador de leitura e cabeçalho atualizados; mover uma válvula pelo teclado limpou a avaliação e restaurou o estado de espera. Números da sonda não foram inseridos na interface. Conferência em 1280, 390 e 320 px; sem overflow horizontal, válvulas com 254 × 44 px em 320 px. Modo discreto confirmou animação `none`, console sem erros ou avisos. Fixture removida e viewport restaurado. A partida salva não foi alterada. Não houve playthrough integral ou conclusão da variante de sonda nesta revisão.
