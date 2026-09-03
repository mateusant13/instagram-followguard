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

## Quanto tempo demora?

Depende de **quantas pessoas** você segue e **quantos te seguem**. Quanto maior a conta, mais demora — é normal.

| Sua conta (mais ou menos) | Quanto esperar |
|---------------------------|----------------|
| Pequena (até ~500) | Alguns minutos |
| Média (até ~2 mil) | ~15–30 minutos |
| Grande (5 mil+) | Pode passar de **1 hora** |
| Muito grande (20 mil+) | Deixe rodando — **várias horas** não é raro |

**O que você precisa fazer:** deixar **uma aba do Instagram aberta** (pode minimizar ou usar outra aba). Não precisa ficar olhando — quando acabar, o painel mostra **atualizado**.

**Por que não é na hora?** Porque o Instagram não gosta de ferramenta que puxa milhares de nomes em segundos. O FollowGuard vai **devagar de propósito** — igual você rolando a lista no celular. Isso **protege sua conta** (menos chance de bloqueio, verificação ou “aguarde um momento”).

**É seguro?** Não pede senha. Tudo fica **no seu navegador** — eu não recebo sua lista, não tem upload pra lugar nenhum.

**Apareceu erro ou “aguarde”?** Em conta grande isso acontece. O app **tenta de novo sozinho** — não precisa ficar clicando em sincronizar.

---

## Atualizar para versão nova

**Não apague a extensão** se quiser manter suas listas — **remover apaga tudo** do navegador.

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
- **Nada sai do seu PC**: listas e histórico ficam **só no navegador** onde você instalou.
- A extensão não lê mensagens nem DMs — só quem você segue / quem te segue.
- Você pode **Apagar todos os dados** no rodapé do painel quando quiser.

---

Feito por [@mateusant13](https://github.com/mateusant13)
