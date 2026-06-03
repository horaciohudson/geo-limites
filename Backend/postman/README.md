
# GeoLimites API - Coleção Postman

Esta pasta contém os arquivos necessários para testar a API do GeoLimites no Postman.

## 📁 Arquivos

- **`MemorialPro_API_Collection.json`** - Coleção completa com todos os endpoints
- **`MemorialPro_Environment.json`** - Ambiente de desenvolvimento local
- **`README.md`** - Este arquivo com instruções

> Nota: os nomes dos arquivos da coleção e do ambiente foram mantidos como `MemorialPro_*` apenas por compatibilidade com imports e referências já existentes no Postman.

## 🚀 Como Usar

### 1. Importar no Postman

1. Abra o Postman
2. Clique em **Import** (botão no canto superior esquerdo)
3. Arraste os arquivos `MemorialPro_API_Collection.json` e `MemorialPro_Environment.json`
4. Ou use **Upload Files** e selecione os dois arquivos

### 2. Configurar Ambiente

1. No canto superior direito, selecione o ambiente **"GeoLimites - Local"**
2. Verifique se a `base_url` está configurada como `http://localhost:9010`

### 3. Fazer Login

1. Vá para a pasta **🔐 Autenticação**
2. Execute a requisição **Login** com as credenciais:
   ```json
   {
     "username": "admin@geolimites.com",
     "password": "123456"
   }
   ```
3. Copie o `token` da resposta
4. Cole no campo `access_token` do ambiente (ou use o script de teste abaixo)

### 4. Script Automático para Salvar Token

Para automatizar o processo, adicione este script na aba **Tests** da requisição de Login:

```javascript
// Salvar token automaticamente após login
if (pm.response.code === 200) {
    const response = pm.response.json();
    
    // Salvar access token
    pm.environment.set("access_token", response.token);
    
    // Salvar refresh token se existir
    if (response.refreshToken) {
        pm.environment.set("refresh_token", response.refreshToken);
    }
    
    console.log("✅ Tokens salvos automaticamente!");
}
```

## 📋 Endpoints Disponíveis

### 🔐 Autenticação
- **POST** `/api/auth/login` - Fazer login
- **POST** `/api/auth/register` - Registrar usuário
- **POST** `/api/auth/refresh` - Renovar token
- **POST** `/api/auth/logout` - Fazer logout
- **GET** `/api/auth/me` - Obter usuário atual

### 👥 Usuários (ADMIN apenas)
- **GET** `/api/users` - Listar usuários
- **POST** `/api/users` - Criar usuário
- **GET** `/api/users/{id}` - Obter usuário por ID

### 📁 Arquivos DXF
- **POST** `/api/dxf/upload` - Upload de arquivo DXF
- **GET** `/api/dxf/my-files` - Listar meus arquivos
- **POST** `/api/dxf/compare` - Comparar arquivos DXF

### 📋 Memorial Descritivo
- **POST** `/api/memorial/generate-gpt` - Gerar memorial assistido
- **POST** `/api/memorial/generate-standard` - Gerar padrão
- **POST** `/api/memorial/export` - Exportar memorial

### 📝 Templates
- **GET** `/api/templates` - Listar templates
- **POST** `/api/templates` - Criar template
- **POST** `/api/templates/generate` - Gerar com template

### 📊 Memorial Standards
- **GET** `/api/memorial-standards` - Listar standards
- **POST** `/api/memorial-standards` - Criar standard

## 🔑 Autenticação

Todos os endpoints (exceto login, register e refresh) requerem autenticação via Bearer Token:

```
Authorization: Bearer {{access_token}}
```

O token é automaticamente incluído nas requisições quando você usa a variável `{{access_token}}`.

## ⚠️ Credenciais Padrão

- **Username**: `admin@geolimites.com`
- **Password**: `123456`

## 🔄 Refresh Token

Quando o access token expirar (24h), use o endpoint `/api/auth/refresh` com o refresh token para obter um novo access token.

## 🐛 Troubleshooting

### Erro 401 - Unauthorized
- Verifique se o token está configurado corretamente
- Faça login novamente se o token expirou

### Erro 403 - Forbidden
- Verifique se seu usuário tem permissão para o endpoint
- Alguns endpoints são apenas para ADMIN

### Erro 500 - Internal Server Error
- Verifique se o backend está rodando na porta 9010
- Verifique os logs do backend para mais detalhes

## 📝 Notas

- O backend deve estar rodando em `http://localhost:9010`
- Tokens JWT têm validade de 24 horas
- Refresh tokens têm validade de 7 dias
- Para upload de arquivos, use o tipo `form-data` no body
