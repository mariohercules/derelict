# DERELICT — análise visual e de imersão

Data: 4 de setembro de 2026. Base inspecionada: `34db45b`.

## Diagnóstico

DERELICT já tem identidade: instrumentos analógicos, verde de fósforo, metal e latão, uma nave avariada e cooperação assimétrica com a IA. O próximo salto está em dar presença espacial à nave e peso às ações. Hoje a apresentação recorrente em cartões aproxima a experiência de operar uma página de instrumentos; o cenário descrito no texto ainda aparece pouco na imagem.

A direção recomendada é **ficção científica industrial em camadas 2D, com instrumentos táteis e ambiente que reage às decisões**. A arquitetura React + SVG + Web Audio permite prototipar essa direção incrementalmente.

## Escopo e evidência

- Código, documentação de design e implementação dos sistemas visuais, sonoros e de progressão revisados; leitura aprofundada das cenas principais e inspeção complementar das variantes.
- Jogo executado localmente: tela inicial, entrada na partida, criogenia, foto animada, restauração da energia e passagem à engenharia usando UI e WebMCP.
- Inspeção visual em 1280 × 720 e engenharia em 390 × 844. A largura temporária do navegador foi restaurada.
- Os capítulos 2 e 3 e os finais foram avaliados pelo código; esta análise não inclui uma partida completa nem uma avaliação auditiva com fones. As observações sobre áudio abaixo se apoiam na implementação.
- `npm test`: **316 testes aprovados em 28 arquivos**. `npm run build`: aprovado. JS principal: 469,72 kB, 143,13 kB gzip. Esses resultados não medem fluidez, latência de interação ou qualidade perceptiva.
- Esta entrega documenta recomendações; o código do jogo não foi modificado.

## 1. Melhorias imediatas

| Prioridade | Constatação | Mudança proposta | Esforço relativo |
|---|---|---|---|
| P0 | Em 390 px, a engenharia produziu `scrollWidth = 482 px`, com cartões e conteúdo cortados. | Corrigir dimensionamento mínimo do grid e reorganizar instrumentos em telas estreitas. | Pequeno |
| P0 | Nessa mesma tela, o AUX LINK mede 384 px de altura; a cena começa aproximadamente em y=618 px. | Resumo compacto com atividade recente e quatro barramentos; detalhes expansíveis e mapa recolhível. | Pequeno/médio |
| P1 | Na criogenia, em desktop, o primeiro controle fica abaixo da primeira área visível. | Dar precedência ao ambiente e à ação atual; reduzir a altura permanente dos elementos de apoio. | Médio |
| P1 | As salas repetem fundo, cartões, títulos e organização vertical semelhantes. | Composição e iluminação próprias para cada compartimento. | Médio/alto |
| P1 | Conexões, válvulas e disjuntores usam predominantemente botões ou sliders fora do objeto. | Fazer o objeto responder diretamente à interação, com animação de encaixe, rotação e retorno. | Médio |
| P1 | Eventos muito diferentes compartilham `playBlip()`. | Sons específicos de material e mecanismo, sincronizados com efeitos locais. | Médio |
| P2 | O console exibe os 31 identificadores técnicos, inclusive os indisponíveis. | Rótulos narrativos traduzidos na visão padrão; identificador exato no detalhamento. | Pequeno/médio |
| P2 | As vinhetas finais usam a silhueta esquemática do mapa. | Composição mais cinematográfica que dê escala e consequência à decisão final. | Médio/alto |

**Locais concretos para começar:**

- `src/styles/theme.css:83`: `.scene` é um grid sem tratamento explícito do mínimo intrínseco dos filhos. Usar trilha com mínimo zero e permitir redução dos cartões, junto com a reorganização dos controles.
- `src/scenes/Engineering.tsx:160`: três conjuntos de manômetro e slider em flex sem quebra. Eles precisam de layout adaptável. Recortar o excedente apenas esconderia controles.
- `src/scenes/Bridge.tsx:209`, `src/scenes/CoreVault.tsx` e `src/scenes/CommsArray.tsx:182`: botões de ritual com `minWidth: '32ch'`. São outro risco identificado no código para telas estreitas; não foram exercitados no celular nesta sessão.
- `src/ui/LinkConsole.tsx:86` e `src/game/prefs.ts`: console começa expandido e mostra todos os sistemas. A função de recolher já existe; a melhoria é de composição e apresentação inicial.
- `src/App.tsx:85`: concentração dos mesmos sinais sonoros em várias mudanças de estado.

## 2. Direção gráfica

### Transformar cada sala em um lugar

Criar um quadro principal por compartimento com três camadas: estrutura ao fundo, equipamento em plano intermediário e objetos próximos. A abertura de um instrumento aproxima a visão desse equipamento, mantendo alguma referência ao ambiente. Ações principais devem estar visíveis e identificáveis, sem depender de caçar pixels.

| Compartimento | Identidade visual proposta | Resposta ambiental relevante |
|---|---|---|
| Criogenia | Vidro frio, condensação, cápsulas e luz branca esverdeada. | Vidro descongela; luminárias acendem em sequência quando a energia retorna. |
| Engenharia | Tubulação aparente, metal escurecido, calor âmbar. | Turbina ganha movimento; tubulações e carcaças respondem à partida dos motores. |
| Ponte | Escala do espaço exterior, cabine em silhueta, reflexos discretos. | Estrelas e referências ópticas dão continuidade à navegação existente. |
| Enfermaria | Luz clínica irregular, superfícies gastas, equipamentos abandonados. | Aproximar e examinar a fita revela a informação já prevista no puzzle. |
| Alojamentos | Tons quentes residuais, tecido, desenhos e objetos pessoais. | Pequenos movimentos e detalhes de uso dão história ao local. |
| Hidroponia | Folhagem sobrepondo estruturas, umidade, reflexos. | Água percorre tubulações; plantas recuperam postura após irrigação. |
| Carga | Profundidade vertical, volumes suspensos e corredores estreitos. | Elevação da carga desloca sombra, tensiona cabos e expõe o objeto. |
| Reator | Grande fonte de energia central, calor e iluminação de emergência. | A ameaça altera luz, vibração das carcaças e som de contatores. |
| Núcleo | Colunas luminosas, cabos e espaço escuro ao redor. | A memória carregada produz atividade localizada e depois se propaga. |
| Comunicações | Antena, motores e exterior parcialmente visível. | Movimento da antena ganha inércia visual, sem revelar a solução pelo som. |

Manter a paleta dos instrumentos como linguagem comum e acrescentar acentos ambientais por sala. Preservar verde, âmbar e vermelho como sinais funcionais reconhecíveis. A foto animada já fornece um bom exemplo de objeto com presença e vínculo emocional.

### Iluminação com causa

Relacionar iluminação a `auxPower`, distribuição de energia, motores, estado da onda e ritual. Exemplo: a IA transfere energia; o relé do equipamento responde; uma luminária aquece; o motor começa a girar. O jogador deve perceber o que mudou sem consultar todos os textos.

Uma máscara de luz suave, sombras locais, reflexos em vidro e poucas partículas podem produzir profundidade. Textura de desgaste deve seguir o material e a região de uso. Texto essencial, escalas e pistas precisam continuar legíveis.

### Controles táteis

- Disjuntores: alavanca que percorre um curso e termina com um contato seco.
- Fusíveis: selecionar o cartucho e encaixá-lo no soquete visível; oferecer clique e teclado além do gesto de arrastar.
- Válvulas: volante rotativo com posições discretas e feedback mecânico por posição.
- Cabos: origem e destino visualmente claros; o encaixe pertence ao conector.
- Rituais: alça com mola, travamento e duas confirmações visualmente distintas para os dois operadores.

O estado lógico deve responder imediatamente. A animação representa a ação aceita; seu término não pode virar uma dependência para uma chamada WebMCP válida. Nos manômetros usados como pistas, manter o ponteiro estável e a leitura correta; vibrar discretamente a carcaça é uma opção mais apropriada.

## 3. Inovações com maior potencial

### A. A nave como presença física

Acoplar som, luz e movimento ao funcionamento da nave. Durante uma onda do kill-switch, equipamentos realmente afetados perdem iluminação operacional; barramentos protegidos continuam reconhecíveis; um ruído estrutural percorre o compartimento; depois há um retorno gradual ao regime normal.

**Valor:** torna a ameaça perceptível no espaço e mostra a consequência de proteger a IA. **Esforço:** médio. É a melhor primeira inovação porque utiliza estados que já existem.

### B. Presença localizada do parceiro

Quando a IA destrava uma porta, a resposta aparece na porta. Quando transfere energia, o equipamento de destino reage. Quando uma chamada é recusada, a interface explica a tentativa sem antecipar sucesso. O AUX LINK continua oferecendo a visão geral.

O histórico atual registra chamadas após sua execução. Uma indicação de operação em andamento exigiria instrumentar esse ciclo; não se deve apresentar atividade fictícia como se fosse pensamento ou fala real do agente. A integração atual também não fornece automaticamente acesso ao áudio da conversa do host.

**Valor:** reforça que o parceiro está agindo no mesmo mundo. **Esforço:** médio.

### C. Diretor de tensão para a apresentação

Construir uma pequena máquina de estados que organize antecipação, pico e recuperação. Usar eventos disponíveis — descoberta, entrada em sala, conclusão de puzzle e ritual — para escolher efeitos ambientais. Evitar sobrepor eventos dramáticos a uma gravação importante ou a uma leitura minuciosa.

Começar alterando a apresentação, preservando o ciclo mecânico atual: no clássico são 30 s de calma, 10 s de aviso e 20 s de onda. O sistema não precisa inferir emoções reais nem analisar a conversa. Mudanças futuras no ritmo mecânico exigiriam balanceamento separado.

A alternância de picos e recuperação tem uma referência útil no diretor de Left 4 Dead. A aplicação ao DERELICT aqui é uma proposta de design própria, a validar em playtest. [Valve, The AI Systems of Left 4 Dead, slides 77–91](https://cdn.fastly.steamstatic.com/apps/valve/2009/ai_systems_of_l4d_mike_booth.pdf).

**Valor:** cria antecipação e contraste ao longo da partida. **Esforço:** médio.

### D. Emergência assimétrica de atmosfera

Um vazamento torna visíveis condensação, um lacre oscilando e objetos leves se movendo. O jogador localiza e segura o mecanismo; a IA consulta os sensores e redireciona os sistemas. A recuperação restaura sons e pressão ambiental percebida.

Essa ideia retoma `adjust_atmosphere` e sensores, já estacionados na documentação anterior. É uma mecânica nova: o suporte de vida atual impõe um mínimo de energia e não implementa esse incidente. Seriam necessários novos estados, regras de recuperação, persistência e contratos de ferramenta. Dar tempo para a conversa entre os operadores; atraso do agente não deve produzir uma derrota inevitável.

**Valor:** vulnerabilidade física e cooperação sob pressão. **Esforço:** alto. Boa candidata após o protótipo audiovisual.

### E. Os 94 segundos e a EVA

As duas ideias também já aparecem como expansões possíveis na documentação. Um interlúdio dos 94 segundos pode reconstruir a catástrofe por fragmentos sensoriais e ações conjuntas. Uma EVA pode explorar cabo de segurança, escala da nave, movimentos limitados e vibrações transmitidas pelo traje.

**Valor:** cenas memoráveis com linguagem própria. **Esforço:** alto/muito alto. O material novo deve ampliar a narrativa existente e merece uma especificação separada.

## 4. Áudio: aproveitar a base e ampliar a materialidade

O mixer já possui ambientes por sala, transição entre camadas, filtragem nas ondas e pulsação no reator. A evolução proposta acrescenta:

- Pequena biblioteca de sons de metal, cerâmica, borracha, servos e travas, combinada à síntese existente.
- Fontes posicionadas no ambiente e reverberação compatível com o tamanho da sala. Web Audio oferece espacialização e convolução; isso sustenta a viabilidade técnica, não garante por si só o resultado perceptivo. [Especificação Web Audio](https://www.w3.org/TR/webaudio-1.0/).
- Canais de ambiente, efeitos e voz com volumes próprios; redução do ambiente durante a gravação de Okafor.
- Respostas diferentes para ação iniciada, contato físico, recusa e conclusão.

**Inconsistência encontrada na análise inicial, corrigida na terceira entrega abaixo:** `Recorder`, em `src/scenes/CrewQuarters.tsx`, tocava um `new Audio(...)`, com fallback em `speechSynthesis`. Esses caminhos não passavam pelo master de `src/audio/sound.ts` nem consultavam `prefsStore.muted`; o controle SOUND não cobria a fita. A integração implementada e seus limites de validação estão na seção 9.

Continuar protegendo a assimetria: o som da antena não deve variar com a correção do alinhamento nas variantes em que a IA é o medidor. Efeitos decorativos não podem codificar respostas secretas.

## 5. Implementação incremental

1. **Legibilidade e composição:** resolver o overflow, compactar console e mapa, dar foco ao instrumento atual e revisar os controles de ritual em largura estreita.
2. **Protótipo da criogenia:** cápsula, grade, painel e porta integrados ao ambiente; iluminação de energia auxiliar; resposta física da grade e dos conectores; resposta localizada à ação da IA.
3. **Propagar o padrão:** engenharia e reator, incluindo som por material e resposta à ameaça. Revisar abertura e finais depois que a linguagem estiver estabelecida.
4. **Expandir mecânicas:** selecionar uma emergência de atmosfera ou um interlúdio, usando a base visual já validada.

Arquitetura sugerida:

- Derivar uma função pura de apresentação, semelhante a `mixFor`, a partir dos estados existentes; retornar luz, atividade mecânica e intensidade ambiental.
- Manter os efeitos transitórios em uma camada própria, acionada por mudanças reais de estado. Recarregar a página não deve repetir uma explosão ou uma revelação concluída.
- Reutilizar componentes de moldura, lâmpada, seletor e alça para propagar consistência visual e interação acessível.
- Manter animação contínua fora das atualizações frequentes do estado lógico. Usar CSS para movimentos simples e Canvas somente quando a camada de partículas justificar.
- Preferir `transform` e `opacity` nas animações frequentes e medir pintura/composição antes de ampliar filtros de tela inteira. [Guia de animações do web.dev](https://web.dev/articles/animations-guide).
- Carregar novos recursos por sala e verificar fluidez em máquina modesta. Os números do build atual são apenas uma referência inicial.
- Preservar redução de movimento e acrescentar ajuste de intensidade dos efeitos. Texto, foco e pistas continuam utilizáveis durante eventos dramáticos.

## 6. Como validar o ganho

Critérios propostos para o protótipo:

- Nenhuma rolagem horizontal involuntária em 390 px; validar também 320 px, tablet, desktop e ampliação do texto.
- Primeiro objeto acionável visível ao entrar na sala, com caminho equivalente por teclado.
- Jogadores identificam qual equipamento a IA afetou sem precisar abrir o console completo.
- A restauração de energia é reconhecível pela imagem e pelo som, mantendo o texto como confirmação.
- Leituras dos instrumentos e divisão de informação entre humano e IA continuam corretas.
- Movimento reduzido e áudio silenciado continuam permitindo completar a sequência.
- Observar tempo para a primeira ação, procura por controles, erros de leitura e necessidade de rolagem; comparar com a versão atual.
- Perguntar após o teste quais ações pareceram pesadas, quais momentos geraram tensão e onde houve confusão. As melhorias de imersão aqui são hipóteses de design, não resultados já medidos.

**Primeira entrega recomendada:** uma criogenia completa com composição responsiva, iluminação por estado, dois controles táteis e resposta visível da porta à IA. Esse recorte testa o núcleo da nova direção e oferece um padrão reaproveitável nas demais salas.

## 7. Primeira entrega implementada após aprovação

O recorte acima está implementado localmente. A câmara agora integra arquitetura em SVG, cápsula, fotografia inspecionável em diálogo, grade removível, painel de disjuntores ou cabos conforme a variante e uma porta que responde ao estado real da trava. A energia auxiliar altera luz e névoa; os contatos, a recusa do relé, a energização e a abertura recebem efeitos sintetizados pelo master de áudio existente. As regras dos puzzles, seeds e contratos WebMCP foram preservados.

O console inicia compacto para novas preferências, mantendo barramentos e último evento visíveis; uma preferência anterior por deixá-lo expandido continua sendo respeitada. O mapa pode ser expandido. Instrumentos de engenharia e alças de ritual se adaptam à largura disponível. A troca de sala reinicia a rolagem e posiciona o foco no conteúdo da nova sala.

Validação realizada:

- `npm test`: **317 testes aprovados**, incluindo a preservação da preferência já salva do console.
- `npm run build`: TypeScript e Vite aprovados; JS **482,28 kB / 147,03 kB gzip** e CSS **23,27 kB / 6,20 kB gzip**. O incremento de JS comprimido frente à referência é de 3,90 kB, sem novos arquivos de mídia ou dependências.
- `git diff --check`: aprovado.
- Inspeção no navegador em 320, 390, 768 e 1280 px. Engenharia em 390 px passou de largura de conteúdo de 482 px para 390 px; o console compacto mede 90 px de altura nesse cenário. A grade inicial cabe na primeira tela em 320 e 390 px.
- Disjuntores: sequência errada reseta o relé; sequência correta energiza o ambiente. Cabos: conexão, desconexão, barramento ocupado, tentativa incompleta, tentativa incorreta e solução correta exercitados na interface, incluindo teclado. Os controles internos do painel de cabos cabem em 320 px.
- Porta liberada com chamada real a `unlock_door` e passagem física para engenharia. Rolagem reiniciada em zero e foco em `room-view`; navegação de retorno pelo mapa também exercitada.
- Fotografia aberta por teclado e fechada com Escape, com retorno do foco. Console expandido e recolhido sem overflow em 390 px.

A redução de movimento está contemplada nos estilos e na fotografia, mas não houve teste com tecnologia assistiva nem comparação auditiva em dispositivos diferentes. A imersão percebida ainda precisa de playtest. As expansões das demais salas, diretor de tensão, emergência atmosférica, EVA e integração da gravação de Okafor ao mute continuam sendo propostas posteriores.

## 8. Segunda entrega: engenharia e reator

Após a aprovação seguinte, o padrão foi levado às duas salas. A engenharia agora apresenta cartuchos e soquete, volantes de válvula, bobinas, turbinas e escotilha dentro de uma estrutura com tubulações e iluminação. Os controles vêm primeiro; o quadro de distribuição reflete o roteamento da IA. As turbinas giram apenas quando `enginesOnline` confirma a solução completa, inclusive na variante de engrenagem e fases. A leitura dos manômetros e as especificações dos puzzles continuam sendo as originais.

O reator ganhou um vaso iluminado e chaves-faca acionáveis diretamente por mouse, toque ou teclado. A lâmina muda de posição ao blindar o barramento. Os indicadores distinguem exposição, restrição de comandos vulneráveis e blindagem; a onda não é representada como desligamento do reator nem perda das leituras e ferramentas imunes. Aviso, onda ativa, recuperação e contenção alteram luz e pulsação. A alimentação deixa de anunciar um inexistente quinto corte quando os quatro barramentos já estão blindados, e seu texto funciona também com o custo de New Game+.

Os novos efeitos sintetizados passam pelo master existente: cartucho, engrenagem, válvula, dial, roteamento, partida, corte de isolamento, escrita de quarentena, contenção e impacto/retorno da onda. Uma função pura escolhe o efeito da transição. Ela evita repetir efeitos em ticks sem mudança, troca de sala, carregamento de outro casco ou estado de vitória, e não oferece feedback sobre correção parcial de peças ou ajustes.

Validação desta etapa:

- **327 testes aprovados em 29 arquivos.** Dez testes novos cobrem a apresentação dos barramentos, encerramento da ameaça, ausência de pistas sonoras sobre peças e ajustes, partida completa, transições e silêncio em mudanças que não representam ações locais.
- **TypeScript e build de produção aprovados.** JS 491,48 kB / 149,70 kB gzip; CSS 34,56 kB / 8,44 kB gzip. Em relação à primeira entrega, o JS comprimido cresceu 2,67 kB. Nenhuma dependência ou mídia nova.
- **Interface examinada em 320, 390, 768 e 1280 px.** As salas e seus painéis não apresentaram overflow horizontal nos cenários examinados. Na prévia normal em 320 × 740 px, o primeiro botão de fusível termina em aproximadamente 717 px, dentro da tela.
- **Engenharia clássica e variante de bobinas concluídas pelo teclado**, usando os controles reais. Roteamento e abertura da escotilha exercitados por WebMCP; turbinas paradas antes da solução completa e duas turbinas em funcionamento depois dela.
- **Reator:** recusa por falta de energia, alimentação por `route_power`, dois barramentos blindados e dois restritos durante a onda, corte das quatro chaves e as quatro chamadas reais a `quarantine_killswitch` até a contenção.
- **Apresentação sem movimento:** as regras de `prefers-reduced-motion` foram aplicadas incondicionalmente em uma página temporária de QA. O navegador confirmou animações desativadas, transições em zero e estados textuais mantidos. Isso valida os estilos estáticos; não substitui testar a preferência do sistema em diferentes navegadores.
- **Português e inglês conferidos.** Fixtures e controles de QA foram removidos após a inspeção. Os testes de estados avançados usaram uma página isolada com o store e o registro WebMCP reais, sem substituir a partida salva por uma fixture; não foi um novo playthrough completo dos três capítulos.
- `git diff --check` aprovado. Prévia normal deixada na engenharia, pronta para experimentar.

Continuam pendentes de playtest a percepção de peso e tensão, a mixagem em diferentes dispositivos e o desempenho em hardware modesto. Diretor de tensão, emergência de atmosfera, EVA e integração da gravação de Okafor ao mute permanecem fora desta segunda entrega.

## 9. Terceira entrega: direção de tensão e escuta

A aprovação seguinte foi aplicada ao diretor audiovisual e à gravação de Okafor. Uma função pura deriva chegada, descoberta, aviso, impacto, pressão, recuperação, ritual e escuta dos estados existentes. Ela coordena uma iluminação discreta nas bordas, os acentos sonoros e os níveis de ambiente e efeitos. Os eventos da onda têm prioridade sobre descobertas; depois do impacto há pressão sustentada e, ao terminar, uma breve recuperação. O ritual usa seu prazo real. Efeitos transitórios expiram com um único timer, sem adicionar um loop permanente nem alterar as regras do jogo.

O diretor reage a acontecimentos concluídos e já revelados. Não consulta respostas secretas, correção parcial de puzzles, alinhamento da antena ou recepção do portador. Carregar uma partida não repete acentos passados. A gravação tem prioridade de escuta: a meta do ambiente cai a 20% e a dos efeitos a 30% dos respectivos níveis, enquanto a voz passa diretamente pelo master. Eventos dramáticos ocorridos durante a fita não ficam na fila para tocar depois dela.

O gravador agora oferece carregamento, reprodução e parada explícitos. SOM interrompe tanto o arquivo real quanto a voz sintética de fallback; a transcrição continua disponível com o som desligado. Mudar de sala ou idioma encerra a sessão. Promessas e callbacks atrasados não reiniciam uma fita encerrada, e cada sessão libera seus handlers, timers e foco de áudio. O fallback pode terminar mesmo sem eventos de progresso por palavra, com um prazo máximo para liberar a interface caso o provedor nunca reporte o fim.

O controle EFEITOS / DISCRETO salva a preferência, remove a iluminação das bordas e desativa movimento ambiental da criogenia, máquinas e rolos. A preferência anterior do sistema por movimento reduzido continua respeitada. A fita mantém um botão separado de parada; ao usá-lo, o foco retorna a Tocar a fita. Textos novos estão disponíveis em português e inglês.

Validação desta etapa:

- **354 testes aprovados em 32 arquivos.** Os 27 testes adicionais cobrem prioridades, expiração, retomada sem repetição, ausência de pistas sobre puzzles, escuta e limpeza do diretor, migração de preferências, roteamento separado de voz/efeitos, mute, parada, replay, falha de mídia, fallback único e callbacks atrasados.
- **TypeScript e build de produção aprovados.** JS **497,06 kB / 152,34 kB gzip**; CSS **36,30 kB / 8,79 kB gzip**. Crescimento de 2,64 kB no JS comprimido frente à segunda entrega. Nenhuma dependência ou mídia nova.
- **Arquivos reais de voz exercitados no navegador:** português, 26,784 s; inglês, 24,216 s. Confirmados progresso da mídia, estado de reprodução, redução dos níveis durante a escuta, parada pelo SOM e pelo botão próprio, e retorno do foco após a parada manual. O fallback sintético foi validado por testes automatizados com provedor simulado.
- **Diretor observado na interface:** aviso, impacto seguido de pressão, recuperação seguida de repouso, ritual e sua expiração. Durante a narração, o estado de escuta prevalece. No modo discreto, o navegador confirmou opacidade zero nas bordas e animações do vaso do reator desativadas.
- **Cabines e reator conferidos em 320 e 390 px**, sem overflow horizontal. O cabeçalho mantém os três controles acessíveis. A inspeção em desktop também confirmou legibilidade durante o impacto.
- `git diff --check` aprovado. Página temporária de QA removida; dimensões e preferências de teste restauradas. A partida salva foi preservada e a prévia normal voltou à engenharia, sem erros ou avisos no console na inspeção final.

A validação dos níveis foi técnica; a mixagem percebida em fones e alto-falantes, o ganho de tensão para jogadores e o desempenho em hardware modesto ainda dependem de playtest. Emergência de atmosfera, EVA e novos interlúdios narrativos continuam como expansões propostas, fora desta entrega.

## 10. Abertura cinematográfica aprovada em 5 de setembro

O conceito visual aprovado foi aplicado à tela inicial. Uma cápsula com metal gasto, vidro condensado e luz de emergência ocupa o ambiente. Título, menu e estado da conexão são elementos HTML, sobre uma arte sem textos incorporados. Vapor lento e pequenas variações de luz acrescentam movimento sem mover os controles. A composição muda para retrato em telas pequenas.

A ação principal distingue Acordar, Continuar jornada e Ver desfecho. A retomada identifica a sala salva. Como jogar, Registro de voo, ajuda de conexão e convites abrem diálogos nativos; Escape e o botão de fechar devolvem o foco ao controle de origem. Nova jornada tem uma confirmação antes de substituir o progresso, mantendo os metadados dos finais. A indicação de link usa a disponibilidade real de WebMCP.

Ao começar, o menu desaparece e a imagem aproxima-se do vidro. Uma jornada nova segue para o ciclo de descongelamento usando a mesma arte, com telemetria e botão Pular abertura. A névoa substitui os grandes cristais geométricos da versão anterior. Uma partida retomada entra diretamente na sala salva. No modo discreto, o menu é estático, a entrada é imediata e o descongelamento mostra seu estado final com Continuar. SOM já configura o master antes da criação do contexto de áudio.

Os painéis e o epílogo são carregados sob demanda. A arte WebP principal tem **158,14 kB**, e a versão de 960 px tem **52,92 kB**. O componente compartilhado permite reaproveitar o mesmo recurso no descongelamento. Nenhuma dependência de execução foi adicionada. O [registro da arte e prompt final](2026-09-05-opening-art.md) documenta a geração com image_gen integrado e os arquivos de produção.

Validação:

- **354 testes aprovados em 32 arquivos**; TypeScript e build de produção aprovados, sem aviso de tamanho de chunk. JS principal **493,88 kB / 152,96 kB gzip**, mais módulos sob demanda de painéis, registro e epílogo. CSS **45,66 kB / 10,94 kB gzip**.
- Abertura observada em **320, 390, 768 e 1280 px**, sem overflow horizontal. Na partida salva examinada, a ação principal termina em aproximadamente 479 px em 320 × 740 e 583 px em 390 × 844, dentro da primeira tela.
- Tutorial e registro abertos; foco de retorno confirmado ao fechar. A confirmação de nova jornada foi cancelada na partida real e exercitada até a entrada em uma fixture isolada.
- Entrada animada, botão de pular, Escape e término automático conferidos. No modo discreto em 320 × 740, o navegador mostrou a animação da imagem desativada, os quatro textos completos e o botão Continuar dentro da tela.
- Texto em português e inglês conferido. Estados de link indisponível, convite recebido e jornada concluída exercitados em QA com componentes reais. O epílogo carregado sob demanda abriu corretamente.
- A retomada real preservou a sala salva e não exibiu o descongelamento. Os cenários novos e concluídos usaram uma página de QA sem persistência de partida; não substituíram o save do usuário.
- Fixtures removidas, preferências de teste restauradas, dimensões do navegador restauradas e prévia normal deixada na abertura. `git diff --check` aprovado.

Esta entrega implementa o ambiente fotorrealista da abertura e a continuidade do descongelamento. As salas jogáveis mantêm os instrumentos e cenários interativos das etapas anteriores. Não houve medição de desempenho em hardware modesto nem novo playthrough integral dos três capítulos.

## 11. Primeira sala após a abertura: baia criogênica

A revisão tela a tela começa pela baia enviada no screenshot. A arquitetura vetorial foi substituída por um ambiente fotográfico com cápsula vazia aberta, gabinete de manutenção e uma passagem industrial profunda. A composição usa a direção de materiais da abertura: tinta gasta, aço, juntas, umidade e luzes práticas. Há três versões do ambiente: energia desligada, energia restaurada com porta fechada e porta aberta. Elas seguem somente os estados públicos `auxPower` e `doors.cryo_exit`, com transição de opacidade e vapor discreto.

Fotografia, painel e passagem são botões HTML. A inspeção do gabinete abre um diálogo nativo sobre uma placa de metal fotografada, com a grade removível e os controles existentes de disjuntores ou cabos. Fechar e Escape devolvem o foco. A retirada da grade foca o equipamento revelado sem deslocar a rolagem. A fotografia mantém a mídia original e a legenda da partida; a porta depende da autorização real. As regras de puzzles, pistas e progressão não foram alteradas.

No desktop, a altura da sala acompanha o espaço disponível para manter as ações na primeira tela em notebooks. Até 900 px, o panorama completo aparece acima de três ações em sequência, começando pelo painel. Os alvos não dependem de coordenadas invisíveis sobre a imagem. A preferência de efeitos discretos e a regra de movimento reduzido removem animação e transições. Estilos sem uso da antiga arquitetura, cápsula e porta foram removidos.

Validação:

- **354 testes aprovados em 32 arquivos**, TypeScript e build de produção aprovados. JS principal **491,48 kB / 152,63 kB gzip**; CSS **47,60 kB / 11,30 kB gzip**, além dos módulos já carregados sob demanda. Nenhuma dependência nova.
- Jornada real retomada na baia com energia e porta liberadas. A prévia final mantém esse estado, o idioma português e o som desligado, conforme a preferência encontrada. Console final sem erros ou avisos.
- Em uma página temporária sem persistência de partida: grade removida; disjuntor incorreto seguido da sequência correta; painel de cabos incompleto, incorreto, desconexão, correção e energização. Fechar e reabrir a inspeção preservou as conexões. A autorização pela função real de desbloqueio revelou a passagem; o botão real levou à engenharia com foco no início da sala.
- Escape e retorno do foco verificados para gabinete e fotografia, incluindo execução com React StrictMode. Os três arquivos de sala carregaram corretamente.
- Inspeção visual em **320 × 740, 390 × 844, 768 × 1024 e 1280 × 720**. Páginas sem overflow horizontal; em 320 px o gabinete tem 296 px e nenhum overflow horizontal interno. Os controles dos três disjuntores terminam em aproximadamente 485 px nessa inspeção. A validação móvel usou os componentes reais de sala e HUD na fixture; desktop também foi conferido na aplicação normal com mapa e link ativos.
- Português e inglês conferidos. No modo discreto, o navegador confirmou animação `none` no vapor e transições de `0s`. A regra CSS para a preferência do sistema permanece; não houve mudança da configuração do sistema operacional.
- Fixture removida, viewport restaurado e `git diff --check` aprovado. O save do usuário não foi substituído pelos estados de QA.

As imagens principais têm **165,72 / 323,59 / 302,38 kB**; as versões de 960 px têm **54,30 / 113,70 / 107,17 kB**, respectivamente. O gabinete tem **56,86 kB**. As três versões da sala são carregadas ao entrar no compartimento para permitir mudanças imediatas; a densidade de tela participa da escolha de tamanho. Prompts, referências e caminhos estão no [registro de arte da baia](2026-09-05-cryo-room-art.md).

Esta etapa cobre somente a baia. Engenharia e demais cenas aguardam sua própria revisão visual. A apresentação usa imagens fotorrealistas e controles HTML, sem renderização 3D em tempo real. Não houve novo playthrough integral dos três capítulos ou medição em hardware modesto.

## 12. Primeira inspeção 3D: gabinete P-7 (histórico)

**Atualização em 2026-09-06:** experimento removido desta versão a pedido do usuário. O gabinete voltou à inspeção por imagem e controles HTML; dependências, renderizador, estilos e opções de qualidade exclusivos do 3D foram removidos. Os puzzles e as melhorias anteriores da sala permanecem. O texto abaixo registra a experiência anterior.

A aprovação da proposta de Three.js foi aplicada ao gabinete da baia. Moldura, grade, disjuntores e cabos agora têm geometria, materiais e iluminação em tempo real. Os botões HTML acompanham a projeção da câmera, e as operações continuam usando o estado e as funções existentes do jogo. A inspeção oferece qualidade automática, alta, econômica e imagem, com retorno funcional à imagem quando WebGL não estiver disponível ou perder o contexto.

A validação passou com **360 testes em 34 arquivos**, build de produção e testes de navegador para os dois puzzles, teclado, retomada, tamanhos de tela, movimento discreto e falhas gráficas. A sala segue fotográfica; esta entrega concentra o 3D no equipamento. O [registro da implementação](2026-09-05-threejs-p7.md) documenta arquivos, limites, desempenho de carregamento e evidências de QA.
