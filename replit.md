# Overview

This is a comprehensive IT ticketing system built as a full-stack web application. The system enables users to submit support tickets and allows technicians and administrators to manage, assign, and resolve these tickets. It features role-based access control with three user types: regular users (ticket creators), technicians, and administrators.

The application provides a complete ticket management workflow including ticket creation, priority assignment, status tracking, commenting system, and reporting capabilities. It's designed for IT support teams to efficiently handle and track technical issues within an organization.

# User Preferences

Preferred communication style: Simple, everyday language.

# System Architecture

## Frontend Architecture
The client-side is built using React with TypeScript and follows a component-based architecture. The application uses Wouter for client-side routing and TanStack Query (React Query) for server state management. The UI is built with Radix UI components and styled using Tailwind CSS with the shadcn/ui component library for a consistent design system.

Key frontend decisions:
- **React with TypeScript**: Provides type safety and better developer experience
- **Wouter**: Lightweight routing solution chosen over React Router for simplicity
- **TanStack Query**: Handles server state, caching, and synchronization automatically
- **Tailwind CSS + shadcn/ui**: Utility-first CSS framework with pre-built accessible components
- **Vite**: Fast build tool for development and production builds

## Backend Architecture
The server follows a REST API architecture built with Express.js and TypeScript. The application uses a service layer pattern with a storage abstraction layer that implements database operations through Drizzle ORM.

Key backend decisions:
- **Express.js**: Mature and widely-adopted Node.js web framework
- **Service Layer Pattern**: Separates business logic from route handlers
- **Storage Abstraction**: Interface-based design allows for easy database switching
- **Middleware-based**: Uses Express middleware for logging, error handling, and request processing

## Data Storage Solutions
The application uses PostgreSQL as the primary database with Drizzle ORM for type-safe database operations. The database schema includes tables for users, tickets, and comments with proper relationships and constraints.

Key data decisions:
- **PostgreSQL**: Chosen for ACID compliance, complex queries, and scalability
- **Drizzle ORM**: Provides type safety and SQL-like query building
- **Neon Database**: PostgreSQL-compatible serverless database for cloud deployment
- **Connection Pooling**: Uses connection pooling for efficient database resource management

## Authentication and Authorization
The system implements a simple session-based authentication with role-based access control. Users are stored in the database with hashed passwords and assigned roles (technician or admin).

Key auth decisions:
- **Simple Password Auth**: Basic username/password authentication suitable for internal tools
- **Role-based Access**: Three distinct user roles with different permissions
- **Session Storage**: Uses localStorage for client-side session persistence
- **Server-side Validation**: All sensitive operations require server-side permission checks

## State Management
Client-side state is managed using TanStack Query for server state and React's built-in state management for UI state. Forms use React Hook Form with Zod validation for type-safe form handling.

Key state decisions:
- **TanStack Query**: Automatically handles caching, background updates, and error states
- **React Hook Form**: Provides performant form handling with minimal re-renders
- **Zod Validation**: Ensures type safety between client and server validation schemas

# External Dependencies

## Database Services
- **Neon Database**: PostgreSQL-compatible serverless database service
- **Connection pooling**: Managed through @neondatabase/serverless package

## UI Component Libraries
- **Radix UI**: Provides accessible, unstyled UI components as primitives
- **Lucide React**: Icon library for consistent iconography
- **shadcn/ui**: Pre-built component library built on top of Radix UI

## Development Tools
- **Drizzle Kit**: Database migration and schema management tool
- **Vite**: Build tool and development server
- **ESBuild**: Fast JavaScript/TypeScript bundler for production builds

## File Upload System
- **Local Storage**: Files stored locally in uploads/ directory using multer
- **No External Dependencies**: Removed Google Cloud Storage and Uppy to avoid external connections

## Form and Validation
- **React Hook Form**: Form state management and validation
- **Zod**: Schema validation library for TypeScript
- **@hookform/resolvers**: Integrates Zod with React Hook Form

## Styling and CSS
- **Tailwind CSS**: Utility-first CSS framework
- **PostCSS**: CSS post-processor for Tailwind
- **class-variance-authority**: Utility for creating component variants
- **clsx**: Utility for constructing className strings conditionally

# Recent Changes

## November 2, 2025 - Correção SQL e Renomeação para Help Doctum
- **Correção crítica**: Corrigido erro SQL no endpoint /api/technician-performance que usava função PostgreSQL (EXTRACT) em ambiente SQLite
- **Compatibilidade SQLite**: Substituído cálculo de diferença de tempo para usar julianday() nativo do SQLite
- **Renomeação do sistema**: Nome alterado de "Sistema de Helpdesk" para "Help Doctum" em toda a aplicação
- **Branding atualizado**: Títulos, cabeçalhos, nomes de arquivos de exportação (Excel/PDF) e metadados atualizados
- **Relatórios funcionando**: Painel de relatórios agora exibe performance dos técnicos sem erros

## November 2, 2025 - Implementação de Timezone e Setores Personalizados
- **Timezone centralizado do Brasil**: Criado utilitário timezone.ts que garante todos os timestamps no fuso horário America/Sao_Paulo
- **Cálculo dinâmico de offset**: getOffsetForTimeZone() calcula offset automaticamente, funcionando corretamente com e sem horário de verão
- **Backend atualizado**: storage.ts usa getBrazilTimestamp() em todas operações (create, update, assign, resolve)
- **Filtros de data corrigidos**: Modal de relatórios normaliza datas para fuso do Brasil antes de comparar
- **Setores personalizados**: Lista atualizada com 12 setores específicos da instituição (Odontologia, NPJ, Biblioteca, Clínica Veterinária, Secretaria, Comercial, Diretoria, RH, Decom, Coordenação, Sala dos Professores, Contas a Pagar)
- **Cálculos de tempo preservados**: Métricas de tempo de resolução continuam funcionando corretamente
- **Consistência total**: Todos timestamps (criação, atualização, atribuição, resolução) agora em horário do Brasil

## September 10, 2025 - Sistema de Notificações por Email
- **Implementado sistema completo de notificações**: Adicionado serviço de email automático para os principais eventos do sistema
- **Notificação de criação de ticket**: Usuários recebem email automático com número do chamado e instruções
- **Notificação de atribuição**: Email enviado quando técnico assume o chamado, informando nome do responsável
- **Notificação de comentários**: Email automático quando técnico adiciona comentários ao chamado
- **Configuração SMTP flexível**: Sistema funciona com qualquer provedor SMTP (Gmail, Outlook, etc.)
- **Modo de teste integrado**: Sistema funciona mesmo sem configuração SMTP (emails não enviados)
- **Templates HTML responsivos**: Emails com design profissional e informações completas
- **Tratamento de erros robusto**: Falhas de email não afetam funcionalidades principais do sistema

## September 7, 2025 - Removed External Upload Dependencies
- **Removed Google Cloud Storage integration**: Deleted objectStorage.ts and objectAcl.ts files
- **Removed Uppy file uploader**: Deleted ObjectUploader.tsx and SimpleFileUploader.tsx components
- **Uninstalled external packages**: Removed @google-cloud/storage, @uppy/core, @uppy/dashboard, @uppy/react, @uppy/aws-s3
- **Simplified upload system**: Now uses only local file storage via multer (existing functionality preserved)
- **Removed external CSS**: Cleaned up Uppy-related styling from index.css
- **Updated frontend**: Removed file upload functionality from ticket creation and comment forms to eliminate external dependencies
- **System now 100% self-contained**: No external API dependencies for deployment on Linux servers