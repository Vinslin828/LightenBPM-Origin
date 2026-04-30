import { Controller, Get, Put, Param, Body, Logger } from '@nestjs/common';
import {
  ApiOperation,
  ApiResponse,
  ApiTags,
  ApiParam,
  ApiBody,
} from '@nestjs/swagger';
import * as formLabels_1 from './form-labels';

@ApiTags('Form Labels Management')
@Controller('form')
export class FormLabelsController {
  private readonly logger = new Logger(FormLabelsController.name);

  @Get(':uuid/labels')
  @ApiOperation({
    summary: 'Retrieve form labels',
    description: 'Get all labels for a specific form in multiple languages.',
    operationId: 'getFormLabels',
  })
  @ApiParam({
    name: 'uuid',
    type: 'string',
    description: 'The unique key of the form to retrieve labels for',
  })
  @ApiResponse({
    status: 200,
    description: 'Form labels retrieved successfully',
    type: formLabels_1.LabelTranslation,
    isArray: true,
  })
  @ApiResponse({ status: 404, description: 'Form not found' })
  @ApiResponse({ status: 500, description: 'Internal Server Error' })
  getFormLabels(@Param('uuid') uuid: string): formLabels_1.FormLabels {
    this.logger.debug(`getFormLabels: uuid = ${uuid}`);
    return {};
  }

  @Put(':uuid/labels')
  @ApiOperation({
    summary: 'Update form labels',
    description: 'Update the labels for a specific form in multiple languages.',
    operationId: 'updateFormLabels',
  })
  @ApiParam({
    name: 'uuid',
    type: 'string',
    description: 'The unique key of the form to update labels for',
  })
  @ApiBody({ type: formLabels_1.LabelTranslation, isArray: true })
  @ApiResponse({
    status: 200,
    description: 'Form labels updated successfully',
    type: formLabels_1.LabelTranslation,
    isArray: true,
  })
  @ApiResponse({ status: 404, description: 'Form not found' })
  @ApiResponse({ status: 500, description: 'Internal Server Error' })
  updateFormLabels(
    @Param('uuid') uuid: string,
    @Body() formLabels: formLabels_1.FormLabels,
  ): formLabels_1.FormLabels {
    this.logger.debug(
      `updateFormLabels: uuid = ${uuid}, formLabels = ${JSON.stringify(formLabels)}`,
    );
    return {};
  }
}
