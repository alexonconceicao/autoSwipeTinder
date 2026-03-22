# AutoSwipe — Auto Liker para Tinder

Script de automação para Tinder que realiza **likes e dislikes automáticos** com base em filtros configuráveis: palavras proibidas, altura e limite de likes. Inclui **painel de controle visual** arrastável, **internacionalização (PT/EN)**, **sistema de logs** e persistência de configurações. Diversos problemas conhecidos foram corrigidos em versões recentes (contadores, persistência de pausa, extração de dados e adaptação ao layout).

> Baseado no script do [@srmura](https://greasyfork.org/en/scripts/519086-auto-like-for-tinder-com-fechamento-autom%C3%A1tico-do-modal), com adição de filtro por altura, limitador de likes, desbloqueio de fotos em “Likes”, extração robusta de dados do perfil, painel redesenhado e sistema de logs detalhado.  
> Referência original: [Auto Like for Tinder (Greasy Fork)](https://greasyfork.org/en/scripts/519086-auto-like-for-tinder-com-fechamento-autom%C3%A1tico-do-modal)

---

## O que ele faz

* **Automatiza** a navegação no Tinder (abertura de perfil, leitura de dados, like/dislike).
* **Abre automaticamente** o perfil de cada pessoa para análise.
* **Extrai** informações do perfil (altura, distância, profissão, signo, pronomes, idiomas, “Sobre mim”).
* **Aplica filtros em camadas**:
  - **Palavras proibidas**: dislike se qualquer palavra da lista aparecer no perfil.
  - **Altura**: dislike conforme limite em cm e condição (maior que / menor que).
  - **Limite de likes**: interrompe ao atingir um número máximo de likes (opcional).
* **Painel flutuante** com contadores em tempo real, dados do perfil atual, controles (intervalos, filtros, pausa) e feedback do último dislike.
* **Internacionalização**: interface em Português ou Inglês, com persistência da escolha.
* **Desbloquear fotos em “Likes”**: opção para remover blur dos cards em “Quem curtiu você” (quando disponível).
* **Persiste** configurações e estado de pausa entre sessões (localStorage).

---

## Compatibilidade

* **Navegadores**: Chrome, Firefox (Tampermonkey / Greasemonkey).
* **Plataforma**: Desktop (interface web do Tinder).
* **Páginas**: `https://tinder.com/*` (recs, matches, likes-you, gold-home, etc.).

---

## Recursos principais

### Sistema de filtros

* **Palavras proibidas**: lista editável no painel (separada por vírgula), comparação sem diferenciar maiúsculas/minúsculas.
* **Filtro de altura**: ativação por toggle, altura limite (100–250 cm), condição “Maior que” ou “Menor que”; conversão automática de formatos (ex.: "158 cm", "1,70 m").
* **Limitador de likes**: toggle + valor numérico; ao atingir o limite, o script pausa e exibe popup; contador pode ser resetado.
* **Ordem de decisão**: palavras proibidas → altura → like (se nenhum filtro rejeitar).

### Painel de controle

* **Arrastável**: arraste pela borda para reposicionar; posição salva no localStorage.
* **Idioma**: botão PT/EN no topo; labels, contadores, card de último dislike e popup seguem o idioma escolhido.
* **Contadores**: likes (e “X/Y” quando limite ativo) e dislikes, atualizados em tempo real com traduções.
* **Controles**: editor de palavras proibidas; sliders para intervalo entre ações e espera ao abrir perfil; toggles para limitador de likes, filtro de altura e “Desbloquear fotos em Likes”; botão Resetar Contador.
* **Informações do perfil**: nome, idade, “Sobre mim”, distância, altura, profissão, pronomes, idiomas (com fallbacks e cache para troca de idioma sem re-extrair do DOM).
* **Card “Último dislike”**: motivo, nome, idade e tempo relativo (“X minutos/likes atrás”), traduzido.
* **Transparência**: opacidade reduzida com hover para não atrapalhar a tela.

### Extração de dados

* Múltiplos formatos de altura (cm, metros com vírgula/ponto).
* Identificação por ícones SVG e fallbacks (busca por texto “cm”, etc.).
* Nome e idade a partir do card principal e do perfil aberto; cache (`lastExtractedInfo`, `lastAboutMeText`) para reaplicar idioma.

### Logs e persistência

* Logs no console (F12) com etapas, método de extração e justificativa de like/dislike.
* localStorage: palavras proibidas, intervalos, filtro de altura, limitador de likes, opção unblur, idioma, estado de pausa, posição do painel, nome/idade do perfil atual e do último dislike.

---

## Como usar

1. Instale o script via Tampermonkey (ou Greasemonkey).
2. Acesse https://tinder.com/app/recs (ou outra página suportada).
3. No painel flutuante:
   - Defina palavras proibidas (vírgula).
   - Opcional: ative e configure filtro de altura e limitador de likes.
   - Ajuste intervalos e, se quiser, “Desbloquear fotos em Likes”.
4. Clique em **Continuar** para iniciar (ou **Pausar** para parar).
5. Acompanhe pelo painel e pelo console (F12).

---

## Observações

* **Intervalos**: 2–3 segundos são recomendados para reduzir risco de detecção.
* **Altura**: conversão automática entre cm e metros.
* **Palavras proibidas**: case-insensitive.
* **Painel**: arraste pela borda (evite arrastar por inputs/botões).
* **Pausa**: estado é salvo; ao recarregar, o script inicia pausado se estava pausado antes.

---

## Bugs conhecidos / limitações

* **Layout do Tinder**: mudanças no HTML/CSS podem quebrar seletores e extração.
* **Botão de perfil**: dependente de classes/estrutura atual do Tinder.
* **“Sobre mim”**: em alguns layouts pode não ser capturado.
* **Bloqueio**: uso muito rápido pode acionar proteções da plataforma.

*(Em versões recentes foram corrigidos, entre outros: contadores com valores/traduções corretos, persistência do estado de pausa, reaplicação de idioma sem re-extrair dados do DOM e comportamento ao atingir o limite de likes.)*

---

## Estrutura do código

```
autoswipe.js (IIFE)
│
├── Estado e configuração
│   Variáveis: interval, profileOpenWait, forbiddenWords, likesCount, dislikesCount,
│   isPaused, heightFilter*, likesLimit*, unblurLikesEnabled, lastDislike*, currentProfile*,
│   lastExtractedInfo, lastAboutMeText, uiLang. Carregamento/gravação em localStorage.
│
├── Internacionalização (i18n)
│   ├── T (objeto de traduções pt/en)
│   ├── t(key)                    — texto traduzido
│   ├── formatT(key, ...values)   — placeholder {0},{1},...
│   ├── updateLangButtonLabel()   — botão PT/EN
│   └── applyLanguage()           — reaplica textos no painel (contadores, card, perfil, popup)
│
├── UI do painel
│   ├── createToggle(initialChecked)  — toggle reutilizável (slide)
│   ├── createSlider(...)              — slider com label e persistência
│   ├── createInfoRow(labelKey, value) — linha label: valor no bloco de informações
│   └── Elementos: container arrastável, contadores, inputs, sliders, toggles, card último dislike
│
├── Extração de dados do perfil
│   ├── extractProfileInfo()              — distância, altura, profissão, pronomes, idiomas (SVG + fallbacks)
│   ├── extractNameAndAge()                — nome e idade do contexto atual (card ou perfil)
│   ├── extractNameAndAgeFromOpenProfile() — nome/idade do perfil aberto (antes de dislike)
│   ├── getCurrentProfileNameAndAge()      — wrapper com fallback "Não disponível"
│   └── findProfileInfo()                  — texto "Sobre mim"
│
├── Filtro de altura
│   ├── convertHeightToCm(heightString) — "1,70 m", "188 cm" → cm
│   └── checkHeightFilter(profileHeight)  — retorna { shouldDislike, reason }
│
├── Atualização do painel
│   ├── updateLikeCounter()    — contador de likes (com formato limite X/Y e cores)
│   ├── updateDislikeCounter() — contador de dislikes
│   ├── updateProfileInfo(text) — bloco de informações + "Sobre mim"
│   ├── updateNameAge()        — nome e idade no topo da coluna direita
│   └── updateLastDislikeCard() — card "Último dislike" (motivo, nome, idade, tempo)
│
├── Popup e botões do DOM
│   ├── showLimitReachedPopup() — modal "Limite de likes atingido"
│   ├── findLikeButton()
│   ├── findDislikeButton()
│   └── findProfileButton()    — botão que abre o perfil
│
├── Fluxo principal
│   ├── autoAction()      — abre perfil → extrai dados → palavras proibidas → altura → like/dislike; respeita limite e pausa
│   ├── unblurLikesCards() — desbloqueia fotos em /app/likes-you e /app/gold-home (API teasers)
│   └── main()            — inicializa painel, chama unblurLikesCards se ativo, loop setInterval(autoAction, interval)
│
└── Inicialização
    main() chamado ao carregar o script.
```

---

## Contribuição

O script foi ampliado a partir da base do @srmura (filtros, painel, i18n, unblur, etc.). Não há garantia de manutenção contínua devido a mudanças frequentes no Tinder.

**Contribuições são bem-vindas** para:

* Adaptação a novas estruturas HTML do Tinder  
* Otimização de performance  
* Novos filtros ou opções  
* Correção de bugs e melhorias na interface  

**Para desenvolvedores**: o código está comentado, usa logs detalhados e fallbacks para maior resiliência.

---

**Aviso**: Uso por sua conta e risco. Automatizar ações em plataformas de terceiros pode violar os Termos de Serviço do Tinder.
