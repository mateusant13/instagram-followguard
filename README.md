# IG FollowGuard

Veja **quem não te segue de volta** no Instagram e receba aviso quando alguém deixa de te seguir.


---

## Instalar (primeira vez)

1. **Baixe o ZIP**  
   No GitHub, clique no botão verde **Code** (ou **Código**) → **Download ZIP**.

2. **Extraia o ZIP**  
   O jeito mais simples: abra o arquivo `.zip` que você baixou (clique duas vezes) e **arraste a pasta de dentro** para a **Área de Trabalho**.  
   Vai aparecer uma pasta (ex.: `instagram-followguard-main`).

3. **Abra a página de extensões do seu navegador**  
   Na **barra de URL** (onde você digita endereços de sites), **digite ou cole** o endereço do **seu** navegador e pressione Enter:

   | Navegador | Endereço |
   |-----------|----------|
   | Google Chrome | `chrome://extensions` |
   | Brave | `brave://extensions` |
   | Microsoft Edge | `edge://extensions` |
   | Opera | `opera://extensions` |
   | Vivaldi | `vivaldi://extensions` |
   | Arc (Chromium) | `chrome://extensions` |

4. **Ative o modo desenvolvedor**  
   No canto superior direito, ligue **Modo do desenvolvedor**.

5. **Carregue a extensão**  
   - **Opção A:** arraste a pasta da Área de Trabalho **para dentro** da página de extensões (isso também instala), **ou**  
   - **Opção B:** clique em **Carregar sem compactação** (ou **Load unpacked**) e escolha essa pasta.

6. **Pronto**  
   Abra **instagram.com**, entre com sua conta e vá ao **seu perfil** — o botão colorido do IG FollowGuard aparece ao lado da engrenagem. A sincronização **começa sozinha** (mantenha uma aba do Instagram aberta).

7. **Limpeza e pasta no PC (opcional)**  
   - Pode **apagar o `.zip`** depois de extrair.  
   - A **pasta extraída precisa ficar no PC** — o navegador lê os arquivos dela direto. **Não apague** essa pasta enquanto a extensão estiver instalada.  
   - **Quer guardar em outro lugar** (ex.: Documentos, em vez da Área de Trabalho)? **Não basta arrastar a pasta depois de instalada** — o navegador continua apontando para o caminho antigo e a extensão para de funcionar. Faça assim: **mova a pasta para o lugar desejado** e **instale de novo** a partir dali (arraste a pasta para a página de extensões ou use **Carregar sem compactação** e escolha a pasta no novo local). Se já tinha instalado na Área de Trabalho, pode **remover** a extensão antiga na página de extensões antes — seus dados no navegador não somem só por isso, mas faça **Exportar backup** se quiser garantia.
---

## Primeiro uso

1. Com a extensão instalada e logado no Instagram, **agora você pode usar**.
2. Toque no **botão no seu perfil** ou no **ícone da extensão** para abrir o painel.
3. A sincronização **começa automaticamente** na instalação e ao abrir o painel. Depois de cada sync completa, você ganha **1 atualização manual grátis**; as seguintes respeitam um intervalo dinâmico (contas maiores = espera maior).
4. **Não feche a aba do Instagram** enquanto aparecer “sincronizando…”. Pode deixar em segundo plano.
5. Ações no Instagram **atualizam na hora** (sem precisar sincronizar de novo):
   - **Deixar de seguir** → some de “Não seguem” / “Mútuos”
   - **Seguir** alguém → entra na lista de seguindo
   - **Remover seguidor** → some de “Te seguem”
   - **Aprovar pedido** (conta privada) → aparece em “Novos”
   - **Bloquear** → some das duas listas

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
2. Baixe o ZIP novo, extraia e **substitua os arquivos na mesma pasta** de antes (a que o navegador já usa).
3. Na **barra de URL**, abra a página de extensões do seu navegador (tabela acima) e clique em **Recarregar** no IG FollowGuard.

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
- **Nada é enviado** para servidores nossos: listas e histórico ficam **só no seu navegador**.
- A extensão não lê mensagens nem DMs — só quem você segue / quem te segue.
- Você pode **Apagar todos os dados** no rodapé do painel quando quiser.

---

Feito por [@mateusant13](https://github.com/mateusant13)
