# How to Add a New Entity to the Form Builder

This guide walks you through creating a new entity (form field type) for the form builder. We'll use the `number-field` entity as an example.

## Entity Structure

preperties must have these attributes: width, label, name, disabled, readonly, required

```
number-field: {
  width,        // number - from 1 to 12
  label,        // string - field label
  name,         // string - field unique key
  placeholder,  // string - input placeholder
  defaultValue, // number - default numeric value
  max,          // number - maximum allowed value
  min,          // number - minimum allowed value
  step,         // number - increment/decrement step
  required      // boolean - whether field is required
  readonly      // boolean - whether field is editable
  disabled      // boolean - whether field is diabled
}
```

## Step-by-Step Instructions

### 1. Create Attribute Definitions (if needed)

For each unique attribute, create a definition file:

```typescript
// src/components/form/attributes/[attribute-name]/definition.ts
import { z } from "zod";
import { createAttribute } from "@coltorapps/builder";

export const [attributeName]Attribute = createAttribute({
  name: "[attributeName]",
  validate(value) {
    return z.[type]().optional().parse(value); // or required validation
  },
});
```

**Example for number attributes:**

```typescript
// src/components/form/attributes/min/definition.ts
export const minAttribute = createAttribute({
  name: "min",
  validate(value) {
    return z.number().optional().parse(value);
  },
});
```

### 2. Create Attribute Components

For each attribute, create a component file:

```typescript
// src/components/form/attributes/[attribute-name]/component.tsx
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { formatError, ValidationError } from '@/components/ui/validation-error'
import { createAttributeComponent } from '@coltorapps/builder-react'
import { [attributeName]Attribute } from './definition'

export const [AttributeName]Attribute = createAttributeComponent(
  [attributeName]Attribute,
  function [AttributeName]Attribute(props) {
    return (
      <div>
        <Label htmlFor={props.attribute.name}>[Display Name]</Label>
        <Input
          id={props.attribute.name}
          name={props.attribute.name}
          type="[input-type]"
          value={props.attribute.value ?? ''}
          onChange={e => {
            props.setValue(/* parse value as needed */)
          }}
        />
        <ValidationError>
          {formatError(props.attribute.value, props.attribute.error)?._errors?.[0]}
        </ValidationError>
      </div>
    )
  }
)
```

**Example for MinAttribute:**

```typescript
// src/components/form/attributes/min/component.tsx
export const MinAttribute = createAttributeComponent(
  minAttribute,
  function MinAttribute(props) {
    return (
      <div>
        <Label htmlFor={props.attribute.name}>Minimum Value</Label>
        <Input
          id={props.attribute.name}
          name={props.attribute.name}
          type='number'
          value={props.attribute.value ?? ''}
          onChange={e => {
            props.setValue(e.target.value ? parseFloat(e.target.value) : undefined)
          }}
        />
        <ValidationError>
          {formatError(props.attribute.value, props.attribute.error)?._errors?.[0]}
        </ValidationError>
      </div>
    )
  }
)
```

### 3. Create Entity Definition

```typescript
// src/components/form/entities/[entity-name]/definition.ts
import { z } from "zod";
import { createEntity } from "@coltorapps/builder";

// Import all required attributes
import { widthAttribute } from "../../attributes/width/definition";
import { labelAttribute } from "../../attributes/label/definition";
// ... other attributes

export const [entityName]Entity = createEntity({
  name: "[entityName]",
  attributes: [
    // List all attributes this entity should have
    widthAttribute,
    labelAttribute,
    placeholderAttribute,
    // ... other attributes
  ],
  validate(value, context) {
    let schema = z.[baseType]();

    // Apply conditional validation based on attributes
    if (context.entity.attributes.min !== undefined) {
      schema = schema.min(context.entity.attributes.min);
    }
    if (context.entity.attributes.max !== undefined) {
      schema = schema.max(context.entity.attributes.max);
    }

    if (context.entity.attributes.required) {
      return schema.parse(value);
    }

    return schema.optional().parse(value);
  },
  defaultValue(context) {
    return context.entity.attributes.defaultValue;
  },
});
```

**Example for numberFieldEntity:**

```typescript
export const numberFieldEntity = createEntity({
  name: "numberField",
  attributes: [
    widthAttribute,
    labelAttribute,
    placeholderAttribute,
    defaultNumberValueAttribute,
    requiredAttribute,
    minAttribute,
    maxAttribute,
    stepAttribute,
  ],
  validate(value, context) {
    let schema = z.number();

    if (context.entity.attributes.min !== undefined) {
      schema = schema.min(context.entity.attributes.min);
    }
    if (context.entity.attributes.max !== undefined) {
      schema = schema.max(context.entity.attributes.max);
    }

    if (context.entity.attributes.required) {
      return schema.parse(value);
    }

    return schema.optional().parse(value);
  },
  defaultValue(context) {
    return context.entity.attributes.defaultValue;
  },
});
```

### 4. Create Entity Component

**IMPORTANT: Always check for existing UI components first!**

Before creating the component:

1. **Check `/src/components/ui/` directory** for existing components (input, button, select, toggle, etc.)
2. **If the component doesn't exist**, ask before creating a new one
3. **Use existing UI components** whenever possible for consistency

```typescript
// src/components/form/entities/[entity-name]/component.tsx
import { useId } from 'react'
import { Input } from '@/components/ui/input' // ← Always check /ui/ first!
import { Label } from '@/components/ui/label'
import { formatError } from '@/components/ui/validation-error'
import { createEntityComponent } from '@coltorapps/builder-react'
import { [entityName]Entity } from './definition'
import { useRefWithErrorFocus } from '@/utils/error-focus'

export const [EntityName]Entity = createEntityComponent(
  [entityName]Entity,
  function [EntityName]Entity(props) {
    const id = useId()
    const inputRef = useRefWithErrorFocus<HTMLInputElement>(props.entity.error)

    return (
      <div>
        <Label htmlFor={id} aria-required={props.entity.attributes.required}>
          {props.entity.attributes.label.trim() ? props.entity.attributes.label : 'Label'}
        </Label>
        <Input
          ref={inputRef}
          id={id}
          name={props.entity.id}
          type="[input-type]"
          value={props.entity.value ?? ''}
          onChange={e => {
            // Handle value parsing/conversion
            props.setValue(/* processed value */)
          }}
          placeholder={props.entity.attributes.placeholder}
          required={props.entity.attributes.required}
          className={
            formatError(props.entity.value, props.entity.error)?._errors?.[0]
              ? 'border-red-500'
              : ''
          }
          // Add entity-specific props
        />
      </div>
    )
  }
)
```

### 5. Create Attributes Component

```typescript
// src/components/form/entities/[entity-name]/attributes-component.tsx
import { WidthAttribute } from "../../attributes/width/component";
import { LabelAttribute } from "../../attributes/label/component";
// ... import other attribute components

export function [EntityName]Attributes() {
  return (
    <>
      <WidthAttribute />
      <LabelAttribute />
      <PlaceholderAttribute />
      {/* Add all relevant attribute components */}
    </>
  );
}
```

### 6. Register Entity in Builder Definition

```typescript
// src/components/form/builder/definition.ts
import { [entityName]Entity } from '../entities/[entity-name]/definition'

export const basicFormBuilder = createBuilder({
  entities: [
    // ... existing entities
    [entityName]Entity,
  ]
})
```

### 7. Add Entity to Component Mappings

```typescript
// src/components/form/builder/todo.tsx

// Import components
import { [EntityName]Attributes } from '../entities/[entity-name]/attributes-component'
import { [EntityName]Entity } from '../entities/[entity-name]/component'

// Add to entity components mapping
export const entitiesComponents = {
  // ... existing entities
  [entityName]: [EntityName]Entity,
}

// Add to attributes panel mapping
export const attributesPanelComponents = {
  // ... existing entities
  [entityName]: [EntityName]Attributes,
}
```

> ❗ **Critical**: If the entity **is not** included in `basicFormBuilder`, the palette button will throw `Unknown entity type` when clicked because the builder cannot instantiate it.

### 8. Add Entity to `EntityKey` and Default Attributes

```typescript
// src/types/form-builder.ts
export enum EntityKey {
  // ...
  [EntityName] = '[entity-name]',
}

type [EntityName]Defaults = {
  width: 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9 | 10 | 11 | 12
  label: string
  // ... other attribute types
}

type DefaultAttributes = {
  // ... existing types
  [entityName]: [EntityName]Defaults
}

// src/const/form-builder.ts
import { [EntityName]Entity } from "../components/form/entities/[entity-name]/component";
import { [EntityName]Attributes } from "../components/form/entities/[entity-name]/attributes-component";

export const formBuilderConfig = {
  // ... existing entities
  [EntityKey.[EntityName]]: {
    entity: [EntityName]Entity,
    attribute: [EntityName]Attributes,
    palette: {
      icon: [IconComponent],
      group: PaleteGroup.[Group],
    },
    defaultAttributes: {
      width: 12,
      label: "[Entity Label]",
      // ...
    },
  },
};
```

### Date Picker Enhancements

- `DateSubtypeAttribute` (dropdown with `date`, `time`, `date & time`) should be added to the entity so both the canvas renderer and attributes panel can switch pickers dynamically.
- `DefaultDateValueAttribute` reads the subtype and renders the matching picker (`DatePicker`, `TimePicker`, or `DateTimePicker`) while persisting values as epoch milliseconds. Reuse the shared components in `src/components/ui/datetime-selector.tsx` to keep UX consistent.
- When wiring the date picker entity, include both attributes in the panel so builders can choose the subtype and set a compatible default.

## Summary Checklist

When adding a new entity, make sure you have:

- [ ] **Attribute definitions** - Create definition files for any new attributes
- [ ] **Attribute components** - Create component files for any new attributes
- [ ] **Entity definition** - Define the entity with validation and attributes
- [ ] **Entity component** - Create the form field component
- [ ] **Attributes component** - Create the attributes panel component
- [ ] **Builder registration** - Add entity to the builder definition
- [ ] **Component mappings** - Add to entity and attributes mappings
- [ ] **Default attributes** - Add default values and types
- [ ] **Palette entry** (optional) - Add to palette if needed

## Available UI Components

Before implementing any entity, check these commonly available UI components:

- **Input** (`@/components/ui/input`) - Text, number, email, password, file inputs
- **Button** (`@/components/ui/button`) - Clickable buttons with variants
- **Label** (`@/components/ui/label`) - Form labels with accessibility
- **Select** (`@/components/ui/select`) - Dropdown selections
- **Toggle** (`@/components/ui/toggle`) - On/off toggle switches
- **Checkbox** (`@/components/ui/checkbox`) - Boolean checkboxes
- **Textarea** (`@/components/ui/textarea`) - Multi-line text input
- **Calendar** (`@/components/ui/calendar`) - Date picker components

**Always use existing UI components** to maintain design consistency and accessibility standards.

## Common Patterns

### Input Types

- `text` - Text fields
- `number` - Number fields
- `email` - Email fields
- `password` - Password fields
- `tel` - Phone fields
- `url` - URL fields

### Validation Patterns

- **Required**: `schema.parse(value)` vs `schema.optional().parse(value)`
- **String length**: `z.string().min(1).max(255)`
- **Number range**: `z.number().min(0).max(100)`
- **Email**: `z.string().email()`
- **Custom validation**: Use `.refine()` for complex rules

### Value Parsing

- **String**: `e.target.value`
- **Number**: `parseFloat(e.target.value)` or `parseInt(e.target.value)`
- **Boolean**: `checked` for checkboxes
- **Empty handling**: Convert empty strings to `undefined`

This guide should help you create any new entity type for the form builder system!
