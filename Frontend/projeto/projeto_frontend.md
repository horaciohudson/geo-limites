🧱 Projeto Front-End — GeoLimites
📘 Contexto

Este projeto faz parte do sistema GeoLimites, cujo backend (Spring Boot + PostgreSQL + JWT) ja esta implementado e funcional.
O front-end será desenvolvido em React + TypeScript + CSS puro, rodando lado a lado com o backend.

Objetivo:
Construir uma interface moderna e funcional que permita login JWT, upload/visualizacao de arquivos DXF/DWG, e geracao assistida de memorial descritivo.

⚙️ Setup Inicial
1️⃣ Criação do Projeto

Na pasta raiz (ex: C:\Desenvolvimento\GeoLimites), crie o front-end:

npm create vite@latest geolimites-web -- --template react-ts
cd geolimites-web
npm install axios react-router-dom


(O backend fica em GeoLimites/Backend e o front em GeoLimites/geolimites-web.)

2️⃣ Estrutura recomendada
geolimites-web/
 ├─ src/
 │   ├─ auth/
 │   │   └─ AuthContext.tsx
 │   ├─ routes/
 │   │   └─ PrivateRoute.tsx
 │   ├─ services/
 │   │   └─ api.ts
 │   ├─ models/
 │   │   └─ types.ts
 │   ├─ components/
 │   │   ├─ Navbar.tsx
 │   │   ├─ Sidebar.tsx
 │   │   └─ ViewerDXF.tsx
 │   ├─ pages/
 │   │   ├─ Login.tsx
 │   │   ├─ Files.tsx
 │   │   ├─ Viewer.tsx
 │   │   └─ Report.tsx
 │   ├─ App.tsx
 │   ├─ main.tsx
 │   └─ index.css
 ├─ public/
 └─ package.json

🔐 Autenticação JWT

Tela /login

Salva o token em localStorage

Envia Authorization: Bearer <token> automaticamente nas requisições (via interceptor do Axios)

Usa AuthContext + PrivateRoute para proteger rotas privadas

📁 Upload e Gerenciamento de Arquivos

Página /files lista todos os arquivos do usuário autenticado.

Permite:

Upload de arquivos .dxf ou .dwg

Download

Exclusão

Exibição de tamanho, data e tipo

Endpoints backend
POST /api/dxf/upload
GET  /api/dxf/my-files
GET  /api/dxf/{id}/download
DELETE /api/dxf/{id}

🧩 Visualização DXF / DWG

Componente: ViewerDXF.tsx

Renderiza o DXF usando uma das libs abaixo:

three.js + three-dxf-loader, ou

dxf-parser (mais leve, apenas 2D)

Deve permitir:

Zoom, pan e reset view

Visualizar camadas (layers)

Linhas, textos, polilinhas e blocos

Para DWG: o backend faz a conversão automática para DXF antes da leitura.

🧠 Geração de Memorial Descritivo

Página: /report

Envia o ID do arquivo DXF selecionado ao backend:

POST /api/memorial/generate
{
  "fileId": "<uuid>"
}


Exibe o texto gerado pela API de memorial assistido

Permite baixar o memorial em .pdf

🎨 Interface

Layout limpo, responsivo e minimalista

CSS puro modularizado (index.css, Navbar.css, etc.)

Navbar fixa com botão de logout

Sidebar com seções: “Arquivos”, “Visualizar”, “Gerar Memorial”

Paleta cinza + azul (similar ao backend Swagger)

🧰 Dependências sugeridas
npm install axios react-router-dom three dxf-parser file-saver

🔗 Integração Backend

Base URL configurada em src/services/api.ts:

const api = axios.create({
  baseURL: "http://localhost:9010/api",
});


Com interceptor para JWT:

api.interceptors.request.use(config => {
  const token = localStorage.getItem("token");
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

🧪 Execução local
Rodar Backend:
cd Backend
mvn spring-boot:run

Rodar Frontend:
cd geolimites-web
npm run dev


Abra:
👉 http://localhost:5173 (frontend)
👉 http://localhost:9010/swagger-ui/index.html (backend)

🧠 Instruções para Claude

Leia o arquivo geolimites_frontend_prompt.md e crie o front-end completo em React + TypeScript + CSS puro conforme as especificacoes.
O projeto deve:

Integrar com o backend GeoLimites (port 9010)

Implementar autenticação JWT completa

Renderizar arquivos DXF/DWG (canvas ou SVG)

Gerar memorial descritivo com retorno da API assistida

Manter código limpo e modularizado

Use este site: https://s.tintim.app/accounts/login?next=/  como inspiração.

Abaixo está o backend do projeto.

Confirme se entendeu perfeitamente.
