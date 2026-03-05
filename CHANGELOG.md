# Changelog

All notable changes to AutoSwipe (Auto Liker for Tinder) are documented in this file.

---

## [1.10.0] - 2025-03-05

### Added

- **Internacionalização (i18n)**
  - Suporte a idiomas Português (pt) e Inglês (en) na interface do painel.
  - Objeto de traduções `T` com chaves para todos os textos do painel (labels, tooltips, botões, mensagens).
  - Função `t(key)` para obter a string traduzida conforme o idioma atual.
  - Função `formatT(key, ...values)` para substituir placeholders `{0}`, `{1}`, etc. nas traduções.
  - Botão de alternância de idioma (PT/EN) no canto superior do painel, com persistência em `localStorage` (`autoswipeLang`).
  - Função `applyLanguage()` que reaplica todas as strings traduzidas nos elementos do painel (contadores, labels, card de último dislike, informações do perfil, popup de limite).

- **Desbloquear fotos na seção Likes**
  - Nova opção "Desbloquear fotos em Likes" (PT) / "Unblur Likes photos" (EN), persistida em `localStorage` (`unblurLikesEnabled`).
  - Função `unblurLikesCards()` que chama a API do Tinder `https://api.gotinder.com/v2/fast-match/teasers` com o token `TinderWeb/APIToken`.
  - Execução apenas nas rotas `/app/likes-you` e `/app/gold-home` quando a opção está ativada.
  - Substituição da imagem de fundo dos cards borrados pelos URLs retornados pela API (primeira foto de cada teaser).
  - Logs no console com prefixo `[AutoSwipe Unblur]`; falhas (token ausente, 401, erro de rede) em silêncio, sem alert.

- **Persistência do estado Pausar/Continuar**
  - Estado de pausa (`isPaused`) salvo e carregado de `localStorage` (`autoswipePaused`).
  - Ao atingir o limite de likes, o script define `isPaused = true` e persiste no localStorage.

- **Cache para reaplicação de idioma**
  - Variáveis `lastExtractedInfo` e `lastAboutMeText` para armazenar a última extração do perfil.
  - Permite que `applyLanguage()` atualize nome, idade, "Sobre mim" e demais campos do painel de informações sem re-extrair do DOM.

- **Componente de toggle reutilizável**
  - Estilos CSS injetados para `.autoswipe-toggle-wrap`, `.autoswipe-toggle-track`, `.autoswipe-toggle-knob` (estilo slide).
  - Função `createToggle(initialChecked)` que retorna um objeto com `element`, getter/setter `checked` e `addEventListener('change', fn)`.
  - Usado nas opções do painel para ativar/desativar recursos de forma visual consistente.

### Changed

- **Contadores de Likes e Dislikes**
  - Remoção do texto fixo inicial; passam a ser atualizados via `updateLikeCounter()` e `updateDislikeCounter()` usando as chaves de tradução `likesFormat`, `likesLimitFormat`, `dislikesFormat`.

- **Card "Último Dislike Registrado"**
  - Título, rótulos (Motivo, Nome, etc.), textos de tempo ("X minutos atrás", "X likes atrás") e "Nome não disponível" / "Não especificado" passam a usar as funções `t()` e `formatT()`.

- **Popup "Limite de Likes Atingido"**
  - Título, mensagem, texto informativo e botão "OK" traduzidos via `t()` e `formatT()`.

- **Painel de informações do perfil**
  - Labels (Nome, Idade, Sobre mim, Distância, Altura, Profissão, Pronomes, Idiomas, Não disponível, Nenhuma informação extraída) traduzidos.
  - Ao trocar idioma, o conteúdo é re-renderizado com `lastExtractedInfo` e `lastAboutMeText` sem nova extração do DOM.

- **Botão Pausar/Continuar**
  - Texto do botão ("Pausar" / "Continuar") traduzido e atualizado em `applyLanguage()`.

- **Labels e placeholders**
  - "Palavras proibidas", "Espera ao abrir perfil", "Intervalo entre ações", "Limitador de Likes", "Ativado/Desativado", "Resetar Contador", "Limitador de Altura", "Maior que/Menor que", placeholders de limite e altura passam a usar traduções.

### Technical

- Versão do script atualizada de `1.8.0` para `1.10.0` no cabeçalho do usuerscript.
- Inicialização: `unblurLikesCards()` é chamada uma vez ao iniciar `main()`, sem intervalo periódico, para evitar bloqueio por excesso de requisições à API.

---

[1.10.0]: https://github.com/your-repo/autoswipe/compare/v1.8.0...v1.10.0
