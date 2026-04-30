import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { formatError, ValidationError } from '@/components/ui/validation-error'

import { createAttributeComponent } from '@coltorapps/builder-react'

import { stepAttribute } from './definition'

export const StepAttribute = createAttributeComponent(stepAttribute, function StepAttribute(props) {
  return (
    <div>
      <Label htmlFor={props.attribute.name}>Step</Label>
      <Input
        id={props.attribute.name}
        name={props.attribute.name}
        type='number'
        step='any'
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
})
