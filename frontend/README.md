# Z4rum Frontend (Next.js)

## Env variables (.env.local)
```
NEXT_PUBLIC_API_URL=http://localhost:4000
NEXT_PUBLIC_SOCKET_URL=http://localhost:4000
```

## Install & Run
```
npm install
npm run dev
```

## Pages
- / (home placeholder)
- /(auth)/login
- /(auth)/register
- /match

On login/register success, token is stored in localStorage as `z4rum_token`. Socket connects with `auth.token` to the backend.
