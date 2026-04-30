import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsString } from 'class-validator';

export class FetchSnippetDto {
  @ApiProperty({
    description: 'The body of the async function to execute',
    example:
      "const res = await fetch('https://jsonplaceholder.typicode.com/posts/1'); return await res.json();",
  })
  @IsString()
  @IsNotEmpty()
  function: string;
}
