import {
  Controller,
  Post,
  Body,
  UseGuards,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
} from '@nestjs/swagger';
import { ScriptExecutionService } from './script-execution.service';
import { FetchSnippetDto } from './dto/request/fetch-snippet.dto';
import { AuthGuard } from '../auth/auth.guard';
import {
  BadRequestResponseDto,
  UnauthorizedResponseDto,
  InternalServerErrorResponseDto,
} from '../common/dto/error-response.dto';

@ApiTags('Execution')
@ApiBearerAuth()
@UseGuards(AuthGuard)
@Controller('execution')
export class ScriptExecutionController {
  constructor(
    private readonly scriptExecutionService: ScriptExecutionService,
  ) {}

  @Post('fetch')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Execute a user-defined fetch script',
    description:
      'Runs a JavaScript function body in a secure sandbox. The script has access to a global `fetch` function and must return a result.',
  })
  @ApiResponse({
    status: 200,
    description: 'The script executed successfully and returned a result.',
    schema: {
      type: 'object',
      description: 'The direct JSON-serialized result of the script execution.',
    },
  })
  @ApiResponse({
    status: 400,
    description: 'Bad Request - Script syntax error or runtime error.',
    type: BadRequestResponseDto,
  })
  @ApiResponse({
    status: 401,
    description: 'Unauthorized - Invalid or missing authentication token.',
    type: UnauthorizedResponseDto,
  })
  @ApiResponse({
    status: 408,
    description:
      'Request Timeout - Script execution exceeded the timeout limit.',
  })
  @ApiResponse({
    status: 500,
    description: 'Internal Server Error.',
    type: InternalServerErrorResponseDto,
  })
  async executeFetch(@Body() dto: FetchSnippetDto): Promise<unknown> {
    return this.scriptExecutionService.executeFetch(dto.function);
  }
}
