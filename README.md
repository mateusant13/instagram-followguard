# IG FollowGuard

Veja **quem não te segue de volta** no Instagram e receba aviso quando alguém deixa de te seguir.

---

## Instalar (primeira vez)

1. **Baixe o ZIP**  
   No GitHub, clique no botão verde **Code** (ou **Código**) → **Download ZIP**.  
   Guarde o arquivo `.zip` — **não precisa extrair**.

2. **Abra as extensões do Chrome**  
   Na **barra de URL** do Chrome (onde você digita endereços de sites), **digite ou cole**:  
   `chrome://extensions`  
   e pressione Enter.

3. **Ative o modo desenvolvedor**  
   No canto superior direito, ligue **Modo do desenvolvedor**.

4. **Carregue a extensão**  
   Clique em **Carregar extensão compactada** (ou **Load packed extension**).  
   Selecione o arquivo `.zip` que você baixou.

5. **Pronto**  
   Abra **instagram.com**, entre com sua conta e vá ao **seu perfil** — o botão colorido do IG FollowGuard aparece ao lado da engrenagem. A sincronização **começa sozinha** (mantenha uma aba do Instagram aberta).

---

## Primeiro uso

1. Com a extensão instalada e logado no Instagram, **agora você pode usar**.
2. Toque no **botão no seu perfil** ou no **ícone da extensão** para abrir o painel.
3. A sincronização **começa automaticamente** na instalação e ao abrir o painel. O botão **↻ Sincronizar** fica bloqueado por **15 minutos** após uma sync completa (evita refazer tudo de novo e spammar o Instagram).
4. **Não feche a aba do Instagram** enquanto aparecer “sincronizando…”. Pode deixar em segundo plano.

**Quanto tempo demora?** Depende do tamanho das suas listas. O app busca de **24 em 24** contas, com **pausas variadas** entre cada página (nunca um tempo fixo — pode ser ~1,5 s, ~2,2 s ou ~2,25 s, como alguém rolando a lista no celular). Exemplos aproximados:

| Seguidores + seguindo (total de páginas) | Tempo só de pausas |
|----------------------------------------|-------------------|
| ~100 contas (~9 páginas) | ~20–40 segundos |
| ~500 contas (~42 páginas) | ~2–3 minutos |
| ~1000 contas (~84 páginas) | ~4–6 minutos |
| ~20 mil seguidores (~834 páginas) | ~30–50 minutos (continua sozinha) |

**Contas muito grandes (ex.: 20 mil seguidores):** funciona, mas demora. A sincronização **começa e termina sozinha** — a cada **12 mil contas** por lista ela faz uma pausa (também variada, ~1,5 min, nunca sempre o mesmo número de segundos) e continua de onde parou, sem precisar clicar em nada. Mantenha a aba do Instagram aberta o tempo todo.

**Pacing não elimina rate limit:** o app já rola devagar (24 contas por vez, pausas irregulares entre páginas), mas o Instagram ainda pode pedir para “aguardar” em contas enormes. Isso é limite da plataforma, não bug — a extensão tenta de novo sozinha depois.

---

## Atualizar para versão nova

**Não apague a extensão** se quiser manter suas listas — **remover apaga tudo** do Chrome.

1. No painel, embaixo: **Exportar backup** → guarde o arquivo `.json`.
2. Baixe o ZIP novo (não precisa extrair).
3. Na **barra de URL**, abra `chrome://extensions` e clique em **Recarregar** no IG FollowGuard — ou remova a versão antiga e use **Carregar extensão compactada** com o ZIP novo.

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
