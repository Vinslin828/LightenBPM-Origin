import { ApiProperty } from '@nestjs/swagger';
import { IsArray, IsString } from 'class-validator';

/**
 * DTO for replacing component bindings for a validation rule (PUT operation)
 */
export class PutComponentsDto {
  @ApiProperty({
    description:
      'Array of component types to bind to this validation rule. ' +
      'Empty array will clear all component bindings.',
    example: ['TextField', 'EmailField', 'PasswordField'],
    type: [String],
  })
  @IsArray()
  @IsString({ each: true })
  components: string[];
}
