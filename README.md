# IG FollowGuard

Extensão para Chrome que mostra **quem não te segue de volta** no Instagram e te **notifica quando alguém deixa de te seguir** (guarda os últimos 100 eventos).

- Painel com **todas** as contas: quem você segue e não te segue de volta, quem segue de volta e quem deixou de seguir.
- Notificação quando alguém que você segue deixa de te seguir.
- Botão flutuante aparece só no **seu** perfil, ao lado da engrenagem de configurações (detecta a conta logada automaticamente).
- **Não lê mensagens nem DMs** — só relações de seguir/seguidores, usando a sessão do seu próprio navegador.

## Instalação

1. Baixe este repositório: **Code → Download ZIP** e extraia numa pasta.
2. No Chrome, abra `chrome://extensions`.
3. Ative o **Modo do desenvolvedor** (chave no canto superior direito).
4. Clique em **Carregar sem compactação** e selecione a pasta extraída (a raiz onde está o `manifest.json`).
5. Pronto. Abra o Instagram logado: um botão flutuante aparece no topo do seu perfil, e o ícone da extensão na barra do Chrome abre o painel completo.

## Atualizar sem perder dados

Os dados ficam no **Chrome**, ligados à **instalação** da extensão (ID interno). Se você **remover** a extensão antiga e **carregar de novo** outra pasta, a lista some — isso é comportamento do Chrome, não bug da extensão.

**Forma certa de atualizar:**

1. Na instalação antiga, use **Exportar backup** no rodapé do painel (guarde o `.json`).
2. Substitua os arquivos **na mesma pasta** que já está carregada no Chrome (ou extraia o ZIP por cima).
3. Em `chrome://extensions`, clique em **Recarregar** na extensão IG FollowGuard (não remova).
4. Se você precisou instalar de novo do zero, use **Importar backup** no painel.

**Nunca** remova a extensão antes de exportar o backup, se quiser manter o histórico.

## Como funciona

- Usa a sessão logada do seu navegador (cookies do instagram.com) para listar seguidores e seguindo — sem senha.
- Sincroniza automaticamente (a cada 60 minutos, configurável no painel) e compara com a lista anterior para detectar quem parou de seguir.
- Os dados ficam **somente no seu Chrome** (`chrome.storage.local`), nada é enviado para servidores externos.

## Requisitos

- Chrome (Manifest V3)
- Conta do Instagram logada no navegador

## Testes

```bash
node --test diff.test.mjs notify.test.mjs partial.test.mjs
```

Feito por [@mateusant13](https://github.com/mateusant13).
