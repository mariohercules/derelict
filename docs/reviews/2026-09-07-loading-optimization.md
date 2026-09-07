# Carregamento de cenas sob demanda

## Mudança

As dez cenas do registro usam React.lazy com imports dinâmicos. Bulkhead mantém a transição e o foco e oferece mensagem localizada de carregamento via Suspense enquanto o módulo chega. React reutiliza módulos resolvidos ao revisitar salas. Nenhuma alteração nas regras, saves, imagens ou enigmas.

## Medidas do build

| JavaScript inicial | Antes | Depois |
| --- | ---: | ---: |
| Arquivo principal | 504,15 kB | 270,27 kB |
| Compartilhado pré-carregado | incluído no principal | 113,69 kB |
| Total inicial | 504,15 kB | 383,96 kB |
| Total inicial gzip | 154,77 kB | 131,92 kB |

Redução inicial de aproximadamente 24% sem compressão e 15% em gzip. O total considera o módulo compartilhado referenciado por modulepreload no index.html; não é apenas a redução do arquivo principal. Não inclui CSS, imagens ou requisições posteriores. Não foi medido tempo de carregamento em rede real.

As cenas agora estão em dez chunks entre 6,17 e 19,51 kB, carregados ao entrar. O build não apresenta mais o aviso de chunk acima de 500 kB. A divisão adia downloads; não elimina o código necessário ao percorrer o jogo inteiro. Epílogo e painéis da abertura continuam sob demanda.

## Validação

- 354 testes em 32 arquivos passaram; build aprovado sem avisos; git diff --check limpo.
- Navegador em fixture isolada com o Bulkhead real: dez salas renderizadas com títulos corretos e foco em room-view.
- Descoberta da fita mantida após sair para a ponte e voltar à enfermaria.
- Trocas rápidas entre ponte, cofre e comunicações terminam em comunicações. Navegação com efeitos reduzidos termina com bulkhead idle.
- Mensagem Acessando observada durante o carregamento inicial da baia; cena renderizada em seguida.
- Build de produção servido temporariamente na porta 5174: abertura, despertar, baia e painel P-7 funcionais, sem erros/avisos no console inspecionado.
- Save habitual da porta 5173 preservado. O smoke test de produção criou uma partida de teste na origem separada 5174. Nenhum percurso completo ou simulação de falha de rede realizado.
- Fixtures removidas, abas de teste fechadas e servidor de prévia encerrado.

## Arquivos

- `src/scenes/registry.tsx`
- `src/ui/Bulkhead.tsx`
