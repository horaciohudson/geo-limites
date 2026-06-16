# JWT Development Configuration

## Token JWT para Desenvolvimento

**Secret Key**: `memorialpro-dev-secret-2024`

**Token Gerado**:
```
eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiJhZG1pbiIsIm5hbWUiOiJBZG1pbiBVc2VyIiwiZW1haWwiOiJhZG1pbkBtZW1vcmlhbHByby5jb20iLCJyb2xlIjoiQURNSU4iLCJpYXQiOjE3NjI2MjU2MjgsImV4cCI6MTc5NDE2MTYyOH0.qAXULxbm5yuc3BJNsKe1FAAwKRc5sUKh3w2k37vCdrA
```

## Payload Decodificado

```json
{
  "sub": "admin",
  "name": "Admin User",
  "email": "admin@memorialpro.com",
  "role": "ADMIN",
  "iat": 1762625628,
  "exp": 1794161628
}
```

## Como Gerar Novos Tokens

Para gerar novos tokens JWT para desenvolvimento, use o secret: `memorialpro-dev-secret-2024`

### Exemplo em Node.js:
```javascript
const jwt = require('jsonwebtoken');
const secret = 'memorialpro-dev-secret-2024';

const payload = {
  sub: 'dev-user',
  name: 'Development User',
  iat: Math.floor(Date.now() / 1000),
  exp: Math.floor(Date.now() / 1000) + (365 * 24 * 60 * 60) // 1 ano
};

const token = jwt.sign(payload, secret, { algorithm: 'HS256' });
console.log(token);
```

### Verificação Online:
Você pode verificar/gerar tokens em: https://jwt.io/

- **Algorithm**: HS256
- **Secret**: memorialpro-dev-secret-2024
- **Payload**: Use o JSON acima

## Uso no Projeto

Este token é usado tanto no:
- **Frontend**: `src/auth/AuthContext.tsx` (modo mock)
- **Backend**: `backend-docs/AuthController.java` (documentação)

⚠️ **IMPORTANTE**: Este é um token apenas para desenvolvimento. Em produção, use secrets seguros e tokens com expiração adequada.