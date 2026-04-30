# How to Add a New Icon

This guide explains how to request a new icon to be added to the project's icon library.

## Information to Provide

When requesting a new icon, please provide the following information:

1.  **SVG File Path:** The full path to the source `.svg` file (e.g., `src/assets/icons/my-new-icon.svg`).
2.  **Icon Name:** The desired `PascalCase` name for the React component (e.g., `MyNewIcon`).

## Process

Once you provide the information, the following steps will be taken to integrate the icon into the system:

### 1. SVG File Processing

The source SVG file will be automatically processed:
- All `fill` color attributes will be replaced with `fill="currentColor"`. This allows the icon's color to be controlled with CSS.
- Attributes like `fill="none"` will be preserved.

**Example:**

A path like this:
`<path d="..." fill="#333"/>`

Will be converted to:
`<path d="..." fill="currentColor"/>`

### 2. Icon Component Creation

A new icon component will be created in `@/components/icons/index.tsx`. This involves:

1.  **Importing the SVG:** The processed SVG file will be imported as a React component.
    ```typescript
    // src/components/icons/index.tsx
    import MyNewIconRaw from "@/assets/icons/my-new-icon.svg?react";
    ```

2.  **Creating a Wrapper Component:** A new wrapper component is created to apply default styles and pass through any custom classes or styles.
    ```typescript
    // src/components/icons/index.tsx
    const MyNewIcon = ({ className, style }: IconProps) => (
      <MyNewIconRaw className={cn("w-6 h-6", className)} style={style} />
    );
    ```

### 3. Exporting the Icon

Finally, the new icon component will be added to the main export list in `@/components/icons/index.tsx` to make it available throughout the application.

```typescript
// src/components/icons/index.tsx
export {
  // ... existing icons
  MyNewIcon,
};
```
