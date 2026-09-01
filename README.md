# IG FollowGuard

Veja **quem não te segue de volta** no Instagram e receba aviso quando alguém deixa de te seguir.

---

## Instalar (primeira vez)

1. **Baixe o ZIP**  
   No GitHub, clique no botão verde **Code** (ou **Código**) → **Download ZIP**.  
   Extraia o arquivo — vai aparecer uma pasta (ex.: `instagram-followguard-main`).

2. **Abra as extensões do Chrome**  
   Na barra de endereço do Chrome, cole e Enter:  
   `chrome://extensions`

3. **Ative o modo desenvolvedor**  
   No canto superior direito, ligue a chave **Modo do desenvolvedor**.

4. **Carregue a extensão**  
   Clique em **Carregar sem compactação** (ou **Load unpacked**).  
   Escolha a pasta que você extraiu (a que tem o arquivo `manifest.json` dentro).

5. **Pronto**  
   Fixe o ícone do IG FollowGuard na barra do Chrome se quiser.  
   A extensão **começa a sincronizar sozinha** assim que é instalada (mantenha uma aba do Instagram aberta).  
   Entre no **instagram.com** com sua conta. No **seu perfil**, aparece o botão do FollowGuard ao lado da engrenagem; o ícone da extensão abre o painel (a sync já estará em andamento).

---

## Primeiro uso

1. Esteja **logado** no Instagram no mesmo Chrome.
2. Abra o painel (ícone da extensão ou botão no seu perfil).
3. A sincronização **começa automaticamente** ao instalar e ao abrir o painel. Toque em **↻ Sincronizar** só se quiser forçar de novo.
4. **Não feche a aba do Instagram** enquanto aparecer “sincronizando…”. Pode deixar em segundo plano.

**Quanto tempo demora?** Depende do tamanho das suas listas. O app busca de **24 em 24** contas, com pausa entre cada página (como alguém rolando a lista no celular). Exemplos aproximados:

| Seguidores + seguindo (total de páginas) | Tempo só de pausas |
|----------------------------------------|-------------------|
| ~100 contas (~9 páginas) | ~20–40 segundos |
| ~500 contas (~42 páginas) | ~2–3 minutos |
| ~1000 contas (~84 páginas) | ~4–6 minutos |
| ~20 mil seguidores (~834 páginas) | ~30–50 minutos (continua sozinha) |

**Contas muito grandes (ex.: 20 mil seguidores):** funciona, mas demora. A sincronização **começa e termina sozinha** — a cada **12 mil contas** por lista ela faz uma pausa curta (~90 s) e continua de onde parou, sem precisar clicar em nada. Mantenha a aba do Instagram aberta o tempo todo.

**Pacing não elimina rate limit:** o app já rola devagar (24 contas por vez, pausas entre páginas), mas o Instagram ainda pode pedir para “aguardar” em contas enormes. Isso é limite da plataforma, não bug — a extensão tenta de novo sozinha depois.

---

## Atualizar para versão nova

**Não apague a extensão** se quiser manter suas listas — **remover apaga tudo** do Chrome.

1. No painel, embaixo: **Exportar backup** → guarde o arquivo `.json`.
2. Baixe o ZIP novo e **substitua os arquivos na mesma pasta** de antes.
3. Em `chrome://extensions`, clique em **Recarregar** no IG FollowGuard.

Se já removeu e instalou de novo: **Importar backup** no painel.

---

## O que o painel mostra

- **Não seguem** — você segue, a pessoa não te segue de volta  
- **Te seguem** — te seguem e você não segue de volta  
- **Mútuos** — vocês se seguem  
- **Deixaram** — pararam de te seguir (desde a última sync)  
- **Novos** — começaram a te seguir (a partir da **segunda** sincronização; a primeira só “marca a lista”)

---

## Privacidade e segurança

- Usa a sessão em que você **já está logado** no Instagram — **não pede senha**.
- **Nada é enviado** para servidores nossos: listas e histórico ficam **só no seu Chrome**.
- A extensão não lê mensagens nem DMs — só quem você segue / quem te segue.
- Você pode **Apagar todos os dados** no rodapé do painel quando quiser.

---

Feito por [@mateusant13](https://github.com/mateusant13)
