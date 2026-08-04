# DIAGNÓSTICO TÉCNICO — Contador de Passos e Cérebro (IA)

**Data:** 2026-08-04
**Autor:** Claude (Anthropic), a pedido do desenvolvedor do RLT
**Objetivo:** documentar, com base no nosso próprio código/histórico de bugs e em pesquisa externa (documentação oficial Android/Google/OpenAI/Anthropic, fóruns de desenvolvedores, issues públicas), as causas raiz de dois problemas que o app teve: (1) o contador de passos nunca funcionou de forma confiável no dispositivo real, e (2) o "Cérebro" (assistente de IA) não se comporta como esperado.

## Atualização — correções aplicadas com base neste diagnóstico

Depois deste diagnóstico, o contador de passos foi **reconstruído do zero** e o Cérebro **reconfigurado**, atacando diretamente as causas listadas abaixo:

- **Contador de passos:** novo serviço nativo em Java (`StepCounterService.java`) lendo `Sensor.TYPE_STEP_COUNTER`, com `foregroundServiceType="health"` corretamente declarado e permissão correspondente (item 1.4), fluxo de isenção de otimização de bateria exposto na UI (item 1.3), `BootReceiver` para sobreviver a reboots, baseline persistida em `SharedPreferences` com tratamento de troca de dia e de reboot, e permissões checadas de verdade — sem nenhum `Promise.race` com fallback mentiroso (item 1.6). Health Connect (Opção B) não foi reintroduzido nesta rodada, por depender de uma sincronização (Google Fit → Health Connect) fora do controle do app (item 1.5).
- **Cérebro:** `CapacitorHttp` foi habilitado no `capacitor.config.json`, o que faz o Android nativo executar as chamadas HTTP em vez do WebView — elimina de raiz o bloqueio de CORS descrito no item 2.1, que era a causa mais provável de a chamada à IA falhar silenciosamente dentro do APK. Além disso, quando a IA genuinamente falha (sem chave, sem internet, etc.) e o app cai no parser local, a resposta agora exibe um aviso visível de "Modo simplificado" no chat — o problema do item 2.2 (usuário não sabia qual dos dois caminhos respondeu) deixou de ser silencioso.

Teste em dispositivo real ainda é necessário para confirmar o comportamento em campo — o texto abaixo permanece como o diagnóstico original, para referência.

---

## PARTE 1 — Por que o contador de passos nunca funcionou

### O que foi tentado, em ordem

1. **Implementação original (pré-existente):** `sensorService.ts` + `useStepCounter.ts`/`StepCounter.tsx` contavam passos em JavaScript, no próprio WebView, usando o evento `devicemotion`/`@capacitor/motion` (acelerômetro bruto) com detecção de pico por limiar (threshold + histerese) — **não** usava o sensor de hardware de passos do Android.
2. **Opção A (nesta sessão):** um `Foreground Service` nativo em Kotlin (`StepCounterService.kt`) lendo `Sensor.TYPE_STEP_COUNTER` (o contador de hardware real, cumulativo desde o boot), com um `BroadcastReceiver` para sobreviver a reboots.
3. **Opção B (nesta sessão):** integração com o Health Connect (`androidx.health.connect:connect-client`), como fonte alternativa/fallback caso o sensor nativo falhasse.
4. Após múltiplas rodadas de teste no APK real reportando falha total ("não atualizava, nem abrindo, nem saindo, nem nada"), a feature inteira foi removida a pedido do desenvolvedor.

### Causas técnicas identificadas

**1.1 — Sensores só contam enquanto o listener está registrado, e o registro morre com o app em segundo plano.**
A própria documentação oficial do Android para leitura de passos afirma que o listener do sensor precisa estar vinculado ao ciclo de vida de um Foreground Service — sem isso, o sistema para de entregar eventos assim que o processo é colocado em segundo plano ou o app perde o foco. É exatamente o padrão "abro o app, ele conta puco ou nada, saio, some" que o desenvolvedor reportou.
Fonte: [Use Sensor Manager to measure steps — Android Developers](https://developer.android.com/health-and-fitness/fitness/basic-app/read-step-count-data)

**1.2 — A abordagem original em JS (acelerômetro + limiar) é fundamentalmente mais fraca que o contador de hardware.**
`devicemotion`/`DeviceMotionEvent` só funciona em contexto seguro (HTTPS) e, em vários navegadores/WebViews, exige uma chamada explícita a `DeviceMotionEvent.requestPermission()` disparada por um gesto do usuário — se essa permissão nunca é concedida de fato (o que a sessão já provou acontecer, com o bug do `Promise.race` "mentiroso" descrito abaixo), o evento simplesmente nunca dispara, silenciosamente. Mesmo quando dispara, é uma detecção de passos por heurística (pico de aceleração), muito menos precisa que os algoritmos de fusão de sensores usados pelo contador de hardware do Android (o mesmo que alimenta Google Fit/Samsung Health).
Fontes: [DeviceMotionEvent — MDN](https://developer.mozilla.org/en-US/docs/Web/API/DeviceMotionEvent), [Window: devicemotion event — MDN](https://developer.mozilla.org/en-US/docs/Web/API/Window/devicemotion_event)

**1.3 — Otimização de bateria e restrições agressivas de fabricante matam serviços em segundo plano.**
Mesmo com um Foreground Service corretamente implementado, o Doze Mode do Android já limita CPU/rede em segundo plano por padrão, e fabricantes como Samsung e Xiaomi vão muito além do AOSP:
- A Samsung mantém uma lista de "Sleeping Apps" — um app sem atividade em primeiro plano por ~3 dias é morto automaticamente, mesmo com Foreground Service ativo.
- A Xiaomi (MIUI/HyperOS) mata serviços em segundo plano de forma agressiva e **reseta a permissão de autostart depois de qualquer atualização OTA**, exigindo que o usuário reative manualmente algo que a maioria nunca vai fazer.
Nenhuma dessas exceções foi tratada no código (não havia fluxo para pedir isenção de otimização de bateria, nem aviso ao usuário sobre configurações específicas do fabricante do aparelho).
Fontes: [Optimize for Doze and App Standby — Android Developers](https://developer.android.com/training/monitoring-device-state/doze-standby), [What Android OEMs do to background apps — DEV Community](https://dev.to/stoyan_minchev/what-android-oems-do-to-background-apps-and-the-11-layers-i-built-to-survive-it-28bb)

**1.4 — Android 14+ exige `foregroundServiceType` obrigatório e falha "dura" (crash) se algo não bater.**
A partir da API 34 (Android 14), todo Foreground Service precisa declarar um `android:foregroundServiceType` no manifesto **e** pedir a permissão runtime correspondente a esse tipo. Se `startForeground()` for chamado sem o tipo declarado corretamente, o sistema lança `MissingForegroundServiceTypeException`; se o tipo declarado não bate com o passado no código, é `IllegalArgumentException`; e se `startForeground()` não for chamado dentro de ~10s depois de `onStartCommand()`, o app crasha com `ForegroundServiceDidNotStartInTimeException`. Qualquer um desses erros mata o serviço imediatamente e **silenciosamente do ponto de vista do usuário** (o app não crasha necessariamente por inteiro, mas o serviço nunca chega a rodar) — compatível com o comportamento relatado de "nunca atualiza, em nenhuma situação".
Fontes: [Foreground service types are required — Android Developers](https://developer.android.com/about/versions/14/changes/fgs-types-required), [Guide to Foreground Services on Android 14 — Medium](https://medium.com/@domen.lanisnik/guide-to-foreground-services-on-android-9d0127dc8f9a)

**1.5 — Health Connect exige permissão concedida *e* uma fonte de dados configurada para escrever nele — sem isso, a agregação retorna zero mesmo com tudo "certo" no app.**
Ter a permissão de leitura do Health Connect concedida ao RLT não é suficiente: é preciso que o Google Fit (ou Samsung Health) esteja, ele mesmo, configurado para *escrever* passos no Health Connect — isso é um toggle separado, fora do controle do nosso app, dentro do próprio Google Fit/Health Connect. Se esse elo não estiver configurado no aparelho do usuário, uma consulta de agregação (`client.aggregate(...)`) retorna vazio/zero de forma totalmente silenciosa, sem erro — o app não tem como distinguir "sem permissão" de "permissão ok mas sem dados sincronizados".
Fonte: [Fixing Health Connect sync issues — Big Team Challenge Help](https://help.bigteamchallenge.com/en/articles/152957-fixing-health-connect-sync-issues), [Google Fit does not receive steps from Health Connect — Google Fit Community](https://support.google.com/fit/thread/270121758/google-fit-does-not-receive-steps-from-health-connect?hl=en)

**1.6 — Bugs de programação nossos, já identificados e corrigidos durante esta sessão (mas que não chegaram a ser validados antes da remoção):**
- `handleGrantAll()` usava `Promise.race([pedidoReal, timeout])` com fallback "concedido" — o app dizia "Liberado" para permissões que o usuário ainda nem tinha respondido no diálogo real do sistema.
- A checagem de permissão de notificação usava a API `Notification.requestPermission()` do navegador, que dentro do WebView do Capacitor no Android não está confiavelmente ligada à permissão real `android.permission.POST_NOTIFICATIONS` — podia reportar "não concedido" para sempre, mesmo com o usuário aceitando o diálogo nativo.
- `isHealthConnectAvailable()` colapsava "Health Connect não instalado" e "dispositivo não suporta" no mesmo `false`, impossibilitando diagnosticar qual dos dois era o caso real.

### Conclusão da Parte 1

O contador de passos falhou por uma combinação de **dois tipos de causa**: bugs de programação genuínos (parcialmente corrigidos nesta sessão) e **limitações estruturais da plataforma Android/WebView** que exigem tratamento explícito e testado em dispositivo real (isenção de otimização de bateria, tipo de serviço em primeiro plano corretamente declarado, ou dependência do Health Connect com sincronização configurada no aparelho) — nenhuma das quais chegou a ser validada de ponta a ponta com o painel de diagnóstico visual antes de a feature ser removida a pedido do desenvolvedor. O relatório completo da implementação (antes da remoção) descreve o código exato que existia; este documento foca nas causas de fundo, não no código em si (já apagado).

---

## PARTE 2 — Por que o Cérebro não funciona do jeito esperado

### Arquitetura atual (`src/lib/brainEngine.ts` + `src/lib/brainOrchestrator.ts`)

O Cérebro tem dois caminhos:

1. **Caminho primário — IA real:** `runBrain()` monta um snapshot do estado de saúde do usuário, monta um system prompt detalhado e chama o provedor de IA configurado (Gemini, OpenAI, Anthropic, DeepSeek ou Kimi) **diretamente do cliente**, via `fetch()`, usando a chave de API que o próprio usuário cadastra em Perfil > Assistente de IA. A resposta vira uma lista de `tool calls` que são executadas contra o `HealthContext`.
2. **Caminho de fallback — parser local:** se a chamada ao provedor falhar por **qualquer** motivo (sem chave, chave inválida, sem internet, rate limit, erro de CORS, timeout...), o `catch` em `AIAssistant.tsx` cai para `classifyAndExecuteQuery()` (`brainOrchestrator.ts`) — um classificador **inteiramente baseado em regex/palavras-chave em português**, sem nenhum entendimento real de linguagem natural.

Essa arquitetura foi migrada nesta sessão (tarefa #23) de um proxy servidor (`/api/brain`) para chamada direta do cliente, justamente porque o proxy servidor **nunca funcionava dentro do APK** (um WebView do Capacitor não tem servidor embutido por trás — todo `fetch` para um caminho relativo tipo `/api/...` falhava, e o app caía sempre no parser local fraco). A chamada direta ao provedor resolveu esse problema específico, mas introduziu outros, descritos abaixo.

### Causas técnicas identificadas

**2.1 — CORS: chamar APIs de LLM diretamente do WebView é uma prática que os próprios provedores não garantem, e há relatos ativos de falha em 2026.**

- O endpoint padrão do RLT para Gemini é `https://generativelanguage.googleapis.com/v1beta/openai` (a camada de compatibilidade com a API da OpenAI do Google). Há um issue documentado nas bibliotecas oficiais do Google (`googleapis/js-genai`) mostrando que esse endpoint **falha no preflight de CORS** quando certos headers (como `api-revision`) estão presentes, retornando 403 sem `Access-Control-Allow-Origin` — ou seja, o comportamento de CORS desse endpoint é sensível a detalhes de header e já teve regressões relatadas.
  Fonte: [Interactions API unusable from the browser — googleapis/js-genai#1723](https://github.com/googleapis/js-genai/issues/1723), [Gemini API CORS Error with OpenAI Compatibility — Google AI Developers Forum](https://discuss.ai.google.dev/t/gemini-api-cors-error-with-openai-compatability/58619)
- Para a OpenAI, há relatos de usuários no fórum oficial de bloqueios de CORS no endpoint de chat completions chegando até 2026 ("Chat Completions API endpoint down/blocked - any web browser request"), e a orientação recorrente da própria comunidade é que **"para apps client-side voltados ao público, um proxy no servidor não é opcional"**.
  Fonte: [Chat Completions API endpoint *down/blocked* — OpenAI Developer Community](https://community.openai.com/t/chat-completions-api-endpoint-down-blocked-any-web-browser-request/1362527), [3 common mistakes when integrating the OpenAI API with your web or mobile app — Backmesh](https://backmesh.com/blog/openai-api-mistakes/)
- A Anthropic é a exceção deliberada: manda um header específico (`anthropic-dangerous-direct-browser-access`, já usado no nosso `callAnthropic()`) para *permitir* esse uso — o que por si só confirma que chamar essas APIs direto do navegador/WebView **não é o caso padrão suportado**, é uma exceção explícita de um único provedor.
- Some-se a isso uma particularidade do próprio Capacitor no Android: o WebView roda com origem `http://localhost` (não `capacitor://localhost`, que é iOS), e há issues abertas no repositório oficial do Capacitor sobre esse origin não bater com o esperado em configurações de esquema customizado, quebrando checagens de CORS que dependem do valor exato do `Origin`.
  Fonte: [bug: Android hostname is not included in cors when changing scheme — ionic-team/capacitor#6936](https://github.com/ionic-team/capacitor/issues/6936)

**Efeito prático:** dependendo do provedor escolhido pelo usuário (Gemini é o padrão do app) e de detalhes de implementação que mudam sem aviso do lado do provedor, a chamada de IA pode falhar por CORS especificamente dentro do APK instalado, mesmo com chave de API válida e internet funcionando — e o app, por design, **absorve esse erro silenciosamente e cai no parser local**, sem nunca mostrar "CORS bloqueou a chamada" para o usuário.

**2.2 — O fallback local é estruturalmente muito mais fraco que a IA, e o usuário não tem como saber qual dos dois respondeu.**

O parser local (`parseAndValidateDomain()` em `brainOrchestrator.ts`) funciona por listas fixas de palavras-chave em português (ex.: `/\b(supino|agachamento|dumbbell|treinei|treino|academia|...)\b/` para decidir se é GYM) e expressões regulares para extrair quantidade, data, nome de exercício, etc. Isso é, por natureza:
- Frágil a sinônimos, gírias, erros de digitação ou frases fora do padrão esperado.
- Sem memória de contexto real da conversa (cada frase é processada isoladamente).
- Sujeito a colisão entre domínios — esta própria sessão corrigiu um bug real em que o classificador confundia menções a "passos" com o domínio de Água (tarefa #26 do histórico do projeto), exatamente o tipo de falso-positivo que um classificador de regex comete e um LLM não cometeria.

Como não existe **nenhum indicador visual** na conversa (`AIAssistant.tsx`) diferenciando uma resposta gerada pela IA real de uma resposta gerada pelo parser local — ambas viram a mesma `ChatMessage` de `role: 'assistant'` — o usuário só percebe que "o Cérebro não entendeu direito" sem saber se o problema foi a IA interpretando mal, ou se a IA nem chegou a ser chamada de verdade (por erro de rede/CORS/chave) e quem respondeu foi o parser burro.

**2.3 — Falha de qualquer tipo na chamada de IA (rede, CORS, chave inválida, limite de uso, modelo indisponível) tem o mesmo efeito: cair pro parser fraco, sem diagnóstico.**

O `catch` em `AIAssistant.tsx` (`runBrain` → `catch (aiError)`) trata todo tipo de erro de forma idêntica: tenta o parser local e, se este também não resolver, relança o erro original. Não há log persistente, nem contador de quantas vezes o fallback foi acionado, nem uma mensagem diferenciada para "sem chave configurada" vs "erro de rede" vs "CORS bloqueado" vs "limite de uso atingido" — todas essas causas, tecnicamente bem diferentes, produzem a mesma experiência confusa do lado do usuário.

**2.4 — Exposição de chave de API no cliente é um risco reconhecido pela própria indústria, não específico deste app.**
Guardar a chave de API do provedor de IA em `localStorage` no dispositivo (necessário para a chamada direta funcionar) é exatamente o padrão que os próprios SDKs de IA tentam desencorajar por padrão — a OpenAI, por exemplo, exige a flag explícita `dangerouslyAllowBrowser: true` só para permitir esse uso, avisando que expõe a chave a qualquer pessoa que inspecione o app.
Fonte: [OpenAI Developer Community — dangerouslyAllowBrowser](https://community.openai.com/t/cors-error-am-i-doing-something-wrong/492927)

### Conclusão da Parte 2

O Cérebro "funciona" quando: (a) o usuário configurou uma chave de API válida, (b) o provedor escolhido aceita a chamada direta do WebView sem bloqueio de CORS naquele momento, e (c) a resposta do modelo é bem formada. Quando qualquer um desses três pontos falha — o que, pelas fontes acima, não é incomum nem exclusivo deste app — a experiência degrada silenciosamente para um classificador de regex simples, sem que o usuário saiba que isso aconteceu. Essa combinação (múltiplos pontos de falha possíveis + degradação silenciosa e indistinguível) é a causa mais provável do Cérebro "não funcionar do jeito esperado" de forma intermitente.

---

## Fontes consultadas

- [Use Sensor Manager to measure steps — Android Developers](https://developer.android.com/health-and-fitness/fitness/basic-app/read-step-count-data)
- [DeviceMotionEvent — MDN](https://developer.mozilla.org/en-US/docs/Web/API/DeviceMotionEvent)
- [Window: devicemotion event — MDN](https://developer.mozilla.org/en-US/docs/Web/API/Window/devicemotion_event)
- [Optimize for Doze and App Standby — Android Developers](https://developer.android.com/training/monitoring-device-state/doze-standby)
- [What Android OEMs do to background apps — DEV Community](https://dev.to/stoyan_minchev/what-android-oems-do-to-background-apps-and-the-11-layers-i-built-to-survive-it-28bb)
- [Foreground service types are required — Android Developers](https://developer.android.com/about/versions/14/changes/fgs-types-required)
- [Guide to Foreground Services on Android 14 — Medium](https://medium.com/@domen.lanisnik/guide-to-foreground-services-on-android-9d0127dc8f9a)
- [Fixing Health Connect sync issues — Big Team Challenge Help](https://help.bigteamchallenge.com/en/articles/152957-fixing-health-connect-sync-issues)
- [Google Fit does not receive steps from Health Connect — Google Fit Community](https://support.google.com/fit/thread/270121758/google-fit-does-not-receive-steps-from-health-connect?hl=en)
- [Interactions API unusable from the browser — googleapis/js-genai#1723](https://github.com/googleapis/js-genai/issues/1723)
- [Gemini API CORS Error with OpenAI Compatibility — Google AI Developers Forum](https://discuss.ai.google.dev/t/gemini-api-cors-error-with-openai-compatability/58619)
- [Chat Completions API endpoint down/blocked — OpenAI Developer Community](https://community.openai.com/t/chat-completions-api-endpoint-down-blocked-any-web-browser-request/1362527)
- [3 common mistakes when integrating the OpenAI API with your web or mobile app — Backmesh](https://backmesh.com/blog/openai-api-mistakes/)
- [bug: Android hostname is not included in cors when changing scheme — ionic-team/capacitor#6936](https://github.com/ionic-team/capacitor/issues/6936)
- [OpenAI Developer Community — CORS / dangerouslyAllowBrowser](https://community.openai.com/t/cors-error-am-i-doing-something-wrong/492927)

---

## Nota

Este documento é uma referência de diagnóstico, não um plano de correção. Nenhuma mudança de código foi feita como parte desta investigação — apenas leitura do código existente e pesquisa externa.
