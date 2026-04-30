import {
  registerDecorator,
  ValidationOptions,
  ValidationArguments,
  ValidatorConstraint,
  ValidatorConstraintInterface,
} from 'class-validator';

@ValidatorConstraint({ name: 'atLeastOneProperty', async: false })
export class AtLeastOnePropertyConstraint implements ValidatorConstraintInterface {
  validate(_value: unknown, args: ValidationArguments): boolean {
    const object = args.object as Record<string, unknown>;
    const properties = args.constraints[0] as string[];

    // Check if at least one of the specified properties is defined
    return properties.some(
      (property) =>
        object[property] !== undefined &&
        object[property] !== null &&
        object[property] !== '',
    );
  }

  defaultMessage(args: ValidationArguments): string {
    const properties = args.constraints[0] as string[];
    return `At least one of the following properties must be provided: ${properties.join(', ')}`;
  }
}

/**
 * Validates that at least one of the specified properties is defined
 *
 * @param properties - Array of property names to check
 * @param validationOptions - Additional validation options
 *
 * @example
 * class UpdateDto {
 *   @AtLeastOneProperty(['name', 'description', 'isActive'])
 *   name?: string;
 *   description?: string;
 *   isActive?: boolean;
 * }
 */
export function AtLeastOneProperty(
  properties: string[],
  validationOptions?: ValidationOptions,
) {
  return function (object: object, propertyName: string) {
    registerDecorator({
      target: object.constructor,
      propertyName: propertyName,
      options: validationOptions,
      constraints: [properties],
      validator: AtLeastOnePropertyConstraint,
    });
  };
}
