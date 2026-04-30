# Giant BPM Frontend - Project Instructions

This document provides a comprehensive guide to the architecture, conventions, and development practices for the Giant BPM Frontend project.

## 1. Technology Stack

This project is a modern React application built with Vite and TypeScript. The key libraries and tools are:

- **Framework**: React 19
- **Build Tool**: Vite
- **Language**: TypeScript
- **Package Manager**: pnpm

- **Data Fetching & Server State**: TanStack Query (React Query)
- **HTTP Client**: Axios
- **Routing**: React Router DOM
- **Global Client State**: Jotai
- **Validation**: Zod
- **Dependency Injection**: Inversify with `reflect-metadata`
- **Date & Time**: Day.js
- **Internationalization (i18n)**: i18next

- **UI & Styling**:
  - **Styling**: Tailwind CSS
  - **Component Toolkit**: Radix UI (for accessible primitives)
  - **UI Components**: A custom library in `src/components/ui` following shadcn/ui patterns.
  - **Data Grids**: MUI X Data Grid

- **Form Builder**: Coltor Apps Builder
- **Testing**: Playwright for End-to-End tests
- **Code Quality**: ESLint and Prettier

## 2. Core Concepts & Architecture

### Data Flow

The application follows a layered data flow architecture to ensure a clean separation of concerns. When a component needs data from the backend, the process is as follows:

1.  **UI Layer (Component & Hook)**: A React component calls a custom React Query hook (e.g., `useQuery`) to fetch data. The hook is responsible for managing the request lifecycle: caching, loading states, and error states.
    *   *Files*: `*.tsx` pages or components, `src/hooks/*.ts`

2.  **Service Layer**: The React Query hook calls a method on a feature-specific service (e.g., `FormService`). This service contains application-specific business logic.
    *   *Files*: `src/services/[feature]-service.ts`

3.  **Domain Service Layer**: The feature service, in turn, calls the generic `DomainService`. This central service is responsible for all communication with the backend API. It uses an `axios` instance to make the actual HTTP request.
    *   *Files*: `src/services/domain-service.ts`

4.  **Validation Layer (Zod)**: Upon receiving a response from the API, the `DomainService` uses a **Zod schema** to validate and parse the raw data. This is a critical step that acts as a type guard, ensuring the data conforms to the application's expectations. It also transforms data into more useful types (e.g., coercing date strings into `Date` objects).
    *   *Files*: `src/schemas/*.ts`

5.  **Return Flow**: The validated and transformed data, now conforming to the project's internal TypeScript types, is returned back up the chain to the service, the React Query hook, and finally to the component for rendering.

### State Management

The project distinguishes between two types of state:

-   **Server State**: Data that originates from the backend. This state is managed exclusively by **React Query**. It handles caching, re-fetching, and synchronization automatically. You should always use React Query hooks (`useQuery`, `useMutation`) to handle server state.
-   **Client State**: UI-specific state that is not persisted on the backend (e.g., theme settings, modal visibility). This state is managed by **Jotai**. Jotai atoms are defined in `src/store/atoms.ts`.

### Dependency Injection

The project uses **Inversify** to manage dependencies between services. This helps to decouple modules and makes the codebase easier to test and maintain.

-   **Interfaces**: Service contracts are defined in `src/interfaces/services.ts`.
-   **Symbols**: Unique symbols for each service are defined in `src/types/symbols.ts`.
-   **Container**: The Inversify container, which manages service registration and resolution, is configured in `src/container.ts`.
-   **Usage**: Services are injected into components or other services using the `useService` hook.

## 3. Project Structure

The `src` directory is organized by feature and function:

-   `assets`: Static files like images, fonts, and icons.
-   `components`: Shared React components.
    -   `ui/`: Generic, reusable UI components (e.g., `Button.tsx`, `Input.tsx`).
    -   `form/`: Components related to the form builder.
    -   Other folders for more complex, feature-specific components.
-   `const`: Application-wide constant values (e.g., menu items, form builder keys).
-   `data`: Static and mock data used for development and testing (e.g., `mock-data.ts`).
-   `hooks`: Custom React hooks (e.g., `useService`, `useAuth`).
-   `i18n`: Configuration for the `i18next` library.
-   `interfaces`: TypeScript interfaces that define the contracts for services.
-   `locales`: JSON files containing translations for i18n.
-   `pages`: Top-level components that correspond to a specific route.
-   `schemas`: Zod schemas used for runtime data validation.
-   `services`: Business logic and API communication layer.
    -   `mock/`: Mock implementations of services for development and testing.
-   `store`: Jotai atoms for global client state management.
-   `types`: Core TypeScript `type` and `interface` definitions for domain models.
-   `utils`: Utility functions used across the application.

## 4. Coding Conventions

### Naming Conventions

To ensure consistency, please adhere to the following naming rules:

-   **Files & Directories**: `kebab-case` (e.g., `domain-service.ts`, `form-builder/`).
-   **React Components**: `PascalCase.tsx` (e.g., `FormListPage.tsx`).
-   **Services**: `IPascalCase` for interfaces (`IDomainService`), `PascalCase` for classes (`DomainService`).
-   **Types & Interfaces**: `PascalCase` (e.g., `FormDefinition`, `Task`).
-   **Zod Schemas**: `PascalCaseSchema` (e.g., `FormDefinitionSchema`).
-   **Inferred Zod Types**: `PascalCasePayload` (e.g., `FormDefinitionPayload`).
-   **Hooks**: `useCamelCase` (e.g., `useService`).
-   **Icons**: always use icon under `src/components/icons/index.tsx`.
-   Do not remove my comments or Todos
-   Please avoid using "any" type
-   Please use "satisfies" instead of "as" when casting types

### Schemas vs. Types (Domain Models)

This is a key architectural pattern. For full details, refer to the [official Zod documentation](https://zod.dev/).

-   **`src/schemas` (Validation Layer)**: Use Zod for runtime validation of external data. These act as a gateway to your application.
    -   **Best Practices**: Use `z.enum(TSEnum)` for TypeScript enums and `z.coerce.date()` for coercing strings to `Date` objects.

-   **`src/types` (Internal Domain Layer)**: Use TypeScript `interface` and `type` for static type-checking of data that has already been validated and is used internally. Always check exisiting types before defining a new one.

### Mock Data Integrity

When a Zod schema in `src/schemas` or a TypeScript type in `src/types` is modified, the corresponding mock data in `src/data/mock-data.ts` **must** be updated to reflect the changes. This ensures the mock service provides data consistent with the application's data structures.

### Internationalization (i18n)

All user-facing strings must be internationalized using the `useTranslation` hook from `react-i18next`. Add new translation keys to all locale files in `src/locales`.

## 5. Additional Documentation

For more specific guides on development processes, please refer to the documents in the `/docs` directory:

- [**Architectural Abstraction Guide**](./docs/ABSTRACTION_GUIDE.md)
- [**How to Add a New Entity**](./docs/ADD_NEW_ENTITY.md)
- [**How to Add a New Icon**](./docs/ADD_NEW_ICON.md)

## 6. Development Commands

-   `pnpm dev`: Start the development server.
-   `pnpm build`: Build the application for production.
-   `pnpm lint`: Run ESLint to check for code quality issues.
-   `pnpm format`: Format all code with Prettier.
-   `pnpm test:e2e`: Run Playwright end-to-end tests.
