import { Checkbox } from '@/components/ui/checkbox'
import { Label } from '@/components/ui/label'
import { formatError, ValidationError } from '@/components/ui/validation-error'

import { createAttributeComponent } from '@coltorapps/builder-react'

import { searchInOptionsAttribute } from './definition'

export const SearchInOptionsAttribute = createAttributeComponent(
  searchInOptionsAttribute,
  function SearchInOptionsAttribute(props) {
    return (
      <div>
        <div className='flex items-center space-x-2'>
          <Checkbox
            id={props.attribute.name}
            checked={props.attribute.value || false}
            onCheckedChange={checked => {
              props.setValue(checked === true)
            }}
            className={
              formatError(props.attribute.value, props.attribute.error)?._errors?.[0]
                ? 'border-red-500'
                : ''
            }
          />
          <Label htmlFor={props.attribute.name} className='text-sm font-normal cursor-pointer'>
            Search in Options
          </Label>
        </div>
        <ValidationError>
          {formatError(props.attribute.value, props.attribute.error)?._errors?.[0]}
        </ValidationError>
      </div>
    )
  }
)
