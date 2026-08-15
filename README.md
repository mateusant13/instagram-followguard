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
4. Clique em **Carregar sem compactação** e selecione a pasta **`instagram-followguard-main`** (criada ao extrair o ZIP — é a raiz do repositório, onde está o `manifest.json`).
5. Pronto. Abra o Instagram logado: um botão flutuante aparece no topo do seu perfil, e o ícone da extensão na barra do Chrome abre o painel completo.

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
