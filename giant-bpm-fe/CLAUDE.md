# Giant BPM Frontend - Project Instructions

@docs/ADD_NEW_ENTITY.md

## Project Overview
This is a React + Vite frontend application for the Giant BPM (Business Process Management) system. It features a form builder, workflow management, and master data management capabilities.

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
- **Dependency Injection**: Inversify
- **Testing**: Playwright for E2E tests

## Code Standards & Conventions

### File Structure
- Follow the established folder structure in `src/`
- Components in `components/` with subfolders for complex components
- Pages in `pages/` organized by feature area
- Services in `services/` using dependency injection pattern
- Types and interfaces in dedicated folders
- Localization files in `locales/`

### TypeScript
- Use strict TypeScript configuration
- Define interfaces in `interfaces/` directory
- Use Zod for runtime validation schemas
- Leverage TypeScript for type safety throughout

### React Patterns
- Use functional components with hooks
- Implement custom hooks in `hooks/` directory
- Use Jotai atoms for state management (defined in `store/atoms.ts`)
- Follow React 19 patterns and best practices

### Form Builder
- Form entities are in `components/form/entities/`
- Each entity has: `component.tsx`, `attributes-component.tsx`, `definition.ts`
- Form attributes are in `components/form/attributes/`
- Use the established pattern for adding new form components

### Styling
- Use Tailwind CSS classes
- UI components in `components/ui/` follow shadcn/ui patterns
- Use `cn()` utility for conditional classes (from `utils/cn.ts`)
- Consistent with Material-UI theme when using MUI components

### Internationalization
- All user-facing text must be internationalized
- Use translation keys with `useTranslation()` hook
- Support for en, zh-CN, zh-TW locales
- Add new translations to all locale files

### Services & Dependency Injection
- Use Inversify for dependency injection
- Services implement interfaces from `interfaces/services.ts`
- Mock services available for development/testing
- Services are registered in `container.ts`

## Development Commands
- `pnpm dev` - Start development server
- `pnpm build` - Build for production
- `pnpm lint` - Run ESLint
- `pnpm lint:fix` - Fix ESLint issues
- `pnpm format` - Format code with Prettier
- `pnpm format:check` - Check formatting
- `pnpm test:e2e` - Run Playwright E2E tests

## Code Quality
- ESLint configuration includes React hooks and Prettier rules
- Always run `pnpm lint` and `pnpm format:check` before commits
- Follow the existing code patterns and naming conventions
- Ensure TypeScript compilation passes without errors

## Adding New Features
1. Follow the established folder structure
2. Create appropriate TypeScript interfaces
3. Implement services with dependency injection
4. Add internationalization support
5. Update relevant tests
6. Follow the form builder patterns for form-related features

## Important Notes
- This is a BPM system frontend - focus on workflow and form management features
- The project uses a modular architecture with clear separation of concerns
- Maintain consistency with existing UI patterns and component structure
- Always consider internationalization when adding new features
- Always use tailwind css for styling