# Lighten BPM Frontend

A React + Vite frontend application for the Lighten BPM (Business Process Management) system. Features a form builder, workflow management, and master data management capabilities.

## Technology Stack

- **Framework**: React 19.1.0 with TypeScript
- **Build Tool**: Vite 7.0.4
- **Package Manager**: pnpm (v10.10.0)
- **State Management**: Jotai for atomic state management
- **UI Libraries**: 
  - Material-UI (MUI) for data grids
  - Radix UI for accessible components
  - Tailwind CSS for styling
- **Form Builder**: @coltorapps/builder for drag-and-drop form creation
- **Routing**: React Router DOM v7
- **Internationalization**: i18next with react-i18next

## Getting Started

### Prerequisites

- Node.js (v18 or higher)
- pnpm (v10.10.0 or higher)

### Installation

```bash
# Install dependencies
pnpm install

# Start development server
pnpm dev

# Build for production
pnpm build

# Preview production build
pnpm preview
```

## Development Commands

```bash
# Development
pnpm dev                 # Start development server with HMR

# Building
pnpm build              # Build for production
pnpm preview            # Preview production build

# Code Quality
pnpm lint               # Run ESLint
pnpm lint:fix           # Fix ESLint issues
pnpm format             # Format code with Prettier
pnpm format:check       # Check formatting

# Testing
pnpm test:e2e           # Run Playwright E2E tests
```

## Project Structure

```
src/
├── components/         # Reusable UI components
│   ├── form/          # Form builder components
│   ├── react-flow/    # Workflow components
│   └── ui/            # Base UI components (shadcn/ui)
├── pages/             # Page components
├── services/          # Business logic and API services
├── hooks/             # Custom React hooks
├── store/             # Jotai atoms for state management
├── utils/             # Utility functions
├── interfaces/        # TypeScript interfaces
├── locales/           # Internationalization files
└── container.ts       # Dependency injection container
```

## Features

- **Form Builder**: Drag-and-drop form creation with custom entities
- **Workflow Management**: Visual workflow designer with ReactFlow
- **Master Data Management**: Comprehensive data management system
- **Internationalization**: Support for multiple languages (en, zh-CN, zh-TW)
- **Type Safety**: Full TypeScript support with strict configuration
- **Modern UI**: Clean, accessible interface with Tailwind CSS and Radix UI

## Contributing

1. Follow the established folder structure and naming conventions
2. Use TypeScript for all new code
3. Add internationalization support for user-facing text
4. Run `pnpm lint` and `pnpm format:check` before committing
5. Ensure all tests pass before submitting PRs

For detailed development guidelines, see [CLAUDE.md](./CLAUDE.md).
