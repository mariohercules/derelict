# Arte da abertura cinematográfica

Implementação do conceito aprovado em 5 de setembro de 2026. A arte foi criada e editada com a ferramenta integrada **image_gen**, usando a skill imagegen; não foi usado o fallback CLI/API. A imagem de produção não contém texto, botões ou status. Todos os elementos da interface são HTML sobre a imagem.

## Arquivos de produção

- `src/assets/opening-cryo.webp`: 1672 × 941 px, 158,14 kB.
- `src/assets/opening-cryo-small.webp`: 960 px de largura, 52,92 kB.
- Consumo em `src/ui/OpeningBackdrop.tsx`, compartilhado por `OpeningScreen` e `ColdOpen`.

O PNG gerado foi codificado em WebP com `cwebp`, qualidade 86 no arquivo principal e 84 na versão de 960 px. Essa etapa apenas otimiza resolução/codificação; a criação e a remoção do texto foram feitas pelo image_gen. Nenhuma dependência de execução foi adicionada ao jogo.

## Prompt final de edição

Referência: o conceito DERELICT aprovado, com cápsula criogênica à direita e menu à esquerda.

```text
Use case: precise-object-edit. Edit target: the attached DERELICT opening concept. Produce the production background plate for this exact approved composition. Remove ALL overlay typography and UI: ISV CORMORANT, DERELICT, the two tagline lines, ACORDAR, arrow, COMO JOGAR, REGISTRO DE VOO, bottom LINK AUXILIAR ATIVO with its green dot, and top-right PT-BR / EN. Fill only those areas with the natural underlying dark spacecraft environment, smoothly and invisibly. Preserve the cryopod, angle, layout, textures, all real physical lamps, ice, glass droplets, vapor, lighting, color, detail and photographic quality as closely as possible. Keep the quiet dark left side suitable for HTML menu overlay. No text, symbols, buttons, borders, interface, watermarks or added subjects. Wide landscape same composition.
```

O cenário, a perspectiva e os materiais foram preservados. Movimento do vapor, iluminação sutil, aproximação ao começar e apresentação estática sob redução de movimento são implementados em CSS. A interface não depende de vídeo ou de um motor 3D.
