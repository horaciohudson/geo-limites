# 🏗️ Estrutura Frontend - GeoLimites

## 📁 Organização de Pastas

```
src/
├── 🔐 auth/
│   ├── AuthContext.tsx          # Context de autenticação
│   ├── AuthProvider.tsx         # Provider JWT
│   └── PrivateRoute.tsx         # Proteção de rotas
│
├── 🛠️ components/
│   ├── common/                  # Componentes genéricos
│   │   ├── Button.tsx
│   │   ├── Input.tsx
│   │   ├── Modal.tsx
│   │   ├── Loading.tsx
│   │   ├── Toast.tsx
│   │   └── Pagination.tsx
│   │
│   ├── layout/                  # Layout da aplicação
│   │   ├── Navbar.tsx
│   │   ├── Sidebar.tsx
│   │   ├── Header.tsx
│   │   └── Footer.tsx
│   │
│   ├── properties/              # Componentes de propriedades
│   │   ├── PropertyCard.tsx
│   │   ├── PropertyForm.tsx
│   │   ├── PropertyList.tsx
│   │   ├── PropertySearch.tsx
│   │   └── PropertyDetails.tsx
│   │
│   ├── boundaries/              # Componentes de divisas
│   │   ├── BoundaryForm.tsx
│   │   ├── BoundaryList.tsx
│   │   ├── BoundaryMap.tsx
│   │   └── BoundaryValidator.tsx
│   │
│   ├── landmarks/               # Componentes de marcos
│   │   ├── LandmarkForm.tsx
│   │   ├── LandmarkCard.tsx
│   │   ├── LandmarkMap.tsx
│   │   ├── LandmarkPhotos.tsx
│   │   └── LandmarkInspection.tsx
│   │
│   ├── documents/               # Componentes de documentos
│   │   ├── DocumentUpload.tsx
│   │   ├── DocumentViewer.tsx
│   │   ├── DocumentList.tsx
│   │   ├── DocumentSearch.tsx
│   │   └── DocumentTags.tsx
│   │
│   └── memorial/                # Componentes de memorial
│       ├── MemorialGenerator.tsx
│       ├── MemorialPreview.tsx
│       ├── MemorialProgress.tsx
│       └── MemorialExport.tsx
│
├── 📄 pages/
│   ├── auth/
│   │   ├── Login.tsx
│   │   ├── Register.tsx
│   │   └── ForgotPassword.tsx
│   │
│   ├── properties/
│   │   ├── PropertiesPage.tsx
│   │   ├── PropertyDetailsPage.tsx
│   │   ├── CreatePropertyPage.tsx
│   │   └── EditPropertyPage.tsx
│   │
│   ├── boundaries/
│   │   ├── BoundariesPage.tsx
│   │   └── BoundaryDetailsPage.tsx
│   │
│   ├── landmarks/
│   │   ├── LandmarksPage.tsx
│   │   └── LandmarkDetailsPage.tsx
│   │
│   ├── documents/
│   │   ├── DocumentsPage.tsx
│   │   └── DocumentViewerPage.tsx
│   │
│   ├── memorial/
│   │   ├── MemorialPage.tsx
│   │   └── MemorialHistoryPage.tsx
│   │
│   ├── Dashboard.tsx
│   ├── Profile.tsx
│   └── Settings.tsx
│
├── 🔧 services/
│   ├── api.ts                   # Configuração Axios
│   ├── auth.service.ts          # Serviços de autenticação
│   ├── property.service.ts      # Serviços de propriedades
│   ├── boundary.service.ts      # Serviços de divisas
│   ├── landmark.service.ts      # Serviços de marcos
│   ├── document.service.ts      # Serviços de documentos
│   ├── memorial.service.ts      # Serviços de memorial
│   └── websocket.service.ts     # WebSocket para progresso
│
├── 🎯 hooks/
│   ├── useAuth.ts              # Hook de autenticação
│   ├── useProperties.ts        # Hook de propriedades
│   ├── useBoundaries.ts        # Hook de divisas
│   ├── useLandmarks.ts         # Hook de marcos
│   ├── useDocuments.ts         # Hook de documentos
│   ├── useMemorial.ts          # Hook de memorial
│   └── useWebSocket.ts         # Hook WebSocket
│
├── 📊 types/
│   ├── auth.types.ts           # Tipos de autenticação
│   ├── property.types.ts       # Tipos de propriedades
│   ├── boundary.types.ts       # Tipos de divisas
│   ├── landmark.types.ts       # Tipos de marcos
│   ├── document.types.ts       # Tipos de documentos
│   ├── memorial.types.ts       # Tipos de memorial
│   └── common.types.ts         # Tipos comuns
│
├── 🎨 styles/
│   ├── globals.css             # Estilos globais
│   ├── variables.css           # Variáveis CSS
│   ├── components/             # Estilos por componente
│   │   ├── Button.css
│   │   ├── Modal.css
│   │   └── ...
│   └── pages/                  # Estilos por página
│       ├── Login.css
│       ├── Dashboard.css
│       └── ...
│
├── 🛣️ routes/
│   ├── AppRoutes.tsx           # Configuração de rotas
│   ├── PrivateRoutes.tsx       # Rotas protegidas
│   └── PublicRoutes.tsx        # Rotas públicas
│
├── 🔧 utils/
│   ├── constants.ts            # Constantes da aplicação
│   ├── helpers.ts              # Funções auxiliares
│   ├── validators.ts           # Validações
│   ├── formatters.ts           # Formatadores
│   └── storage.ts              # LocalStorage helpers
│
├── App.tsx                     # Componente principal
├── main.tsx                    # Entry point
└── vite-env.d.ts              # Tipos do Vite
```

## 🛣️ Estrutura de Rotas

```typescript
// AppRoutes.tsx
const routes = [
  // Rotas Públicas
  { path: '/login', component: Login },
  { path: '/register', component: Register },
  { path: '/forgot-password', component: ForgotPassword },
  
  // Rotas Protegidas
  { path: '/', component: Dashboard, protected: true },
  { path: '/profile', component: Profile, protected: true },
  
  // Propriedades
  { path: '/properties', component: PropertiesPage, protected: true },
  { path: '/properties/new', component: CreatePropertyPage, protected: true },
  { path: '/properties/:id', component: PropertyDetailsPage, protected: true },
  { path: '/properties/:id/edit', component: EditPropertyPage, protected: true },
  
  // Divisas
  { path: '/properties/:id/boundaries', component: BoundariesPage, protected: true },
  { path: '/boundaries/:id', component: BoundaryDetailsPage, protected: true },
  
  // Marcos
  { path: '/properties/:id/landmarks', component: LandmarksPage, protected: true },
  { path: '/landmarks/:id', component: LandmarkDetailsPage, protected: true },
  
  // Documentos
  { path: '/properties/:id/documents', component: DocumentsPage, protected: true },
  { path: '/documents/:id/view', component: DocumentViewerPage, protected: true },
  
  // Memorial
  { path: '/memorial', component: MemorialPage, protected: true },
  { path: '/memorial/history', component: MemorialHistoryPage, protected: true },
];
```

## 🎨 Sistema de Design

### **Paleta de Cores**
```css
:root {
  /* Cores Primárias */
  --primary-blue: #2563eb;
  --primary-blue-dark: #1d4ed8;
  --primary-blue-light: #3b82f6;
  
  /* Cores Secundárias */
  --secondary-gray: #6b7280;
  --secondary-gray-dark: #4b5563;
  --secondary-gray-light: #9ca3af;
  
  /* Cores de Status */
  --success: #10b981;
  --warning: #f59e0b;
  --error: #ef4444;
  --info: #06b6d4;
  
  /* Cores Neutras */
  --white: #ffffff;
  --gray-50: #f9fafb;
  --gray-100: #f3f4f6;
  --gray-200: #e5e7eb;
  --gray-300: #d1d5db;
  --gray-400: #9ca3af;
  --gray-500: #6b7280;
  --gray-600: #4b5563;
  --gray-700: #374151;
  --gray-800: #1f2937;
  --gray-900: #111827;
}
```

### **Tipografia**
```css
:root {
  /* Fontes */
  --font-primary: 'Inter', -apple-system, BlinkMacSystemFont, sans-serif;
  --font-mono: 'JetBrains Mono', 'Fira Code', monospace;
  
  /* Tamanhos */
  --text-xs: 0.75rem;    /* 12px */
  --text-sm: 0.875rem;   /* 14px */
  --text-base: 1rem;     /* 16px */
  --text-lg: 1.125rem;   /* 18px */
  --text-xl: 1.25rem;    /* 20px */
  --text-2xl: 1.5rem;    /* 24px */
  --text-3xl: 1.875rem;  /* 30px */
  --text-4xl: 2.25rem;   /* 36px */
}
```

### **Espaçamentos**
```css
:root {
  --space-1: 0.25rem;   /* 4px */
  --space-2: 0.5rem;    /* 8px */
  --space-3: 0.75rem;   /* 12px */
  --space-4: 1rem;      /* 16px */
  --space-5: 1.25rem;   /* 20px */
  --space-6: 1.5rem;    /* 24px */
  --space-8: 2rem;      /* 32px */
  --space-10: 2.5rem;   /* 40px */
  --space-12: 3rem;     /* 48px */
  --space-16: 4rem;     /* 64px */
}
```

## 🧩 Componentes Base

### **1. Button Component**
```typescript
interface ButtonProps {
  variant: 'primary' | 'secondary' | 'outline' | 'ghost' | 'danger';
  size: 'sm' | 'md' | 'lg';
  loading?: boolean;
  disabled?: boolean;
  icon?: React.ReactNode;
  children: React.ReactNode;
  onClick?: () => void;
}
```

### **2. Input Component**
```typescript
interface InputProps {
  type: 'text' | 'email' | 'password' | 'number' | 'tel';
  label?: string;
  placeholder?: string;
  error?: string;
  required?: boolean;
  disabled?: boolean;
  value: string;
  onChange: (value: string) => void;
}
```

### **3. Modal Component**
```typescript
interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  title?: string;
  size: 'sm' | 'md' | 'lg' | 'xl';
  children: React.ReactNode;
}
```

## 📱 Layout Responsivo

### **Breakpoints**
```css
:root {
  --breakpoint-sm: 640px;   /* Mobile */
  --breakpoint-md: 768px;   /* Tablet */
  --breakpoint-lg: 1024px;  /* Desktop */
  --breakpoint-xl: 1280px;  /* Large Desktop */
}
```

### **Grid System**
```css
.container {
  width: 100%;
  max-width: 1280px;
  margin: 0 auto;
  padding: 0 var(--space-4);
}

.grid {
  display: grid;
  gap: var(--space-4);
}

.grid-cols-1 { grid-template-columns: repeat(1, 1fr); }
.grid-cols-2 { grid-template-columns: repeat(2, 1fr); }
.grid-cols-3 { grid-template-columns: repeat(3, 1fr); }
.grid-cols-4 { grid-template-columns: repeat(4, 1fr); }

@media (max-width: 768px) {
  .grid-cols-2,
  .grid-cols-3,
  .grid-cols-4 {
    grid-template-columns: 1fr;
  }
}
```

## 🔄 Estado Global

### **Context Providers**
```typescript
// App.tsx
function App() {
  return (
    <AuthProvider>
      <QueryProvider>
        <ToastProvider>
          <Router>
            <AppRoutes />
          </Router>
        </ToastProvider>
      </QueryProvider>
    </AuthProvider>
  );
}
```

### **Custom Hooks Pattern**
```typescript
// useProperties.ts
export const useProperties = () => {
  const { data, isLoading, error } = useQuery(
    'properties',
    propertyService.getAll
  );
  
  const createMutation = useMutation(propertyService.create);
  const updateMutation = useMutation(propertyService.update);
  const deleteMutation = useMutation(propertyService.delete);
  
  return {
    properties: data,
    isLoading,
    error,
    create: createMutation.mutate,
    update: updateMutation.mutate,
    delete: deleteMutation.mutate,
  };
};
```

## 🚀 Performance e Otimização

### **Code Splitting**
```typescript
// Lazy loading de páginas
const PropertiesPage = lazy(() => import('../pages/properties/PropertiesPage'));
const BoundariesPage = lazy(() => import('../pages/boundaries/BoundariesPage'));
const LandmarksPage = lazy(() => import('../pages/landmarks/LandmarksPage'));
```

### **Memoização**
```typescript
// Componentes pesados
const PropertyMap = memo(({ properties, boundaries }) => {
  // Renderização do mapa
});

// Callbacks estáveis
const handlePropertySelect = useCallback((id: string) => {
  navigate(`/properties/${id}`);
}, [navigate]);
```

### **Virtualização**
```typescript
// Para listas grandes
import { FixedSizeList as List } from 'react-window';

const PropertyList = ({ properties }) => (
  <List
    height={600}
    itemCount={properties.length}
    itemSize={120}
    itemData={properties}
  >
    {PropertyItem}
  </List>
);
```

## 🧪 Testes

### **Estrutura de Testes**
```
src/
├── __tests__/
│   ├── components/
│   ├── pages/
│   ├── services/
│   └── utils/
├── __mocks__/
└── test-utils/
    ├── render.tsx
    ├── server.ts
    └── fixtures.ts
```

### **Configuração Jest**
```typescript
// test-utils/render.tsx
export const renderWithProviders = (ui: React.ReactElement) => {
  return render(
    <AuthProvider>
      <QueryProvider>
        <MemoryRouter>
          {ui}
        </MemoryRouter>
      </QueryProvider>
    </AuthProvider>
  );
};
```

**Sistema completo e estruturado para desenvolvimento eficiente!** 🎯
