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

## Quanto tempo demora — e por que é assim

A sincronização **não é instantânea de propósito**. O FollowGuard busca suas listas **24 contas por vez**, com **pausas variadas** entre cada página (como alguém rolando a lista no celular — às vezes ~1,5 s, às vezes ~2 s, às vezes mais). Isso **demora mais** do que baixar tudo de uma vez, mas é **o jeito certo** de usar o Instagram sem parecer robô.

### Por que demora?

Cada página da lista é uma requisição à API do Instagram. Contas com milhares de seguidores têm **centenas de páginas**. Some o tempo de rede + as pausas entre páginas: o total cresce rápido.

| Tamanho aproximado | Páginas (24 contas cada) | Tempo estimado (só pausas + rede) |
|--------------------|-------------------------|-----------------------------------|
| ~100 contas | ~9 | ~1–2 minutos |
| ~500 contas | ~42 | ~3–5 minutos |
| ~1.000 contas | ~84 | ~5–10 minutos |
| ~5.000 contas | ~420 | ~20–40 minutos |
| ~20.000 seguidores | ~834 só na lista de seguidores | **1 h ou mais** (seguidores + seguindo) |

Os números são **aproximados** — variam com sua conexão e com o Instagram.

### Contas muito grandes (milhares de seguidores)

Funciona, mas **leva tempo**. Você não precisa ficar clicando em nada: a sync **começa e termina sozinha**.

Depois de buscar **até 12 mil contas** numa mesma lista (500 páginas × 24), o app faz uma **pausa longa** (~1,5 min, com variação) e **continua de onde parou**. Essa pausa **não é** o tempo de sincronizar 12 mil pessoas — é só um **intervalo de descanso** entre blocos, para não sobrecarregar a plataforma. Sincronizar 12 mil contas, só nas pausas entre páginas, leva **dezenas de minutos**.

**Mantenha uma aba do Instagram aberta** enquanto sincroniza (pode ficar em segundo plano).

### Por que deve demorar — e por que isso é seguro

Ferramentas que “puxam” milhares de seguidores em segundos costumam **disparar alertas** no Instagram (bloqueio, verificação, limite temporário). O FollowGuard foi feito para o oposto:

- **Pausas irregulares** — nunca o mesmo intervalo duas vezes seguidas  
- **Uma lista por vez** — seguindo, depois seguidores (não tudo em paralelo)  
- **Requisições pela sua aba logada** — mesma origem e sessão que você já usa no site  
- **Dados só no seu navegador** — nada vai para servidor nosso  

Demorar **é a proteção**, não um defeito. Você troca velocidade por **menor chance de restrição na conta**.

### Se aparecer “aguarde” ou erro de limite

Em contas enormes o Instagram às vezes pede para esperar — **limite da plataforma**, não bug do app. O FollowGuard **tenta de novo sozinho** (com intervalos cada vez maiores: 5 min, 15 min, 45 min…). Deixe a aba aberta e aguarde.

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
