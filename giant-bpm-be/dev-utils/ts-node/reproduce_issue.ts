import { plainToInstance } from 'class-transformer';
import { validateSync } from 'class-validator';
import { ListAvailableApplicationsQueryDto } from '../../src/instance/dto/list-available-applications-query.dto';
import {
  ApprovalRequestDto,
  ApprovalRequest,
} from '../../src/instance/dto/approval-types.dto';

function testListAvailableApplicationsQueryDto() {
  console.log(
    'Testing ListAvailableApplicationsQueryDto (single value string)...',
  );
  const obj1 = plainToInstance(ListAvailableApplicationsQueryDto, {
    formTagIds: '249',
  });
  console.log('Result 1:', obj1);
  const errors1 = validateSync(obj1);
  console.log('Errors 1:', errors1);

  console.log(
    '\nTesting ListAvailableApplicationsQueryDto (single value number - simulated query param parsed as number)...',
  );
  const obj2 = plainToInstance(ListAvailableApplicationsQueryDto, {
    formTagIds: 249,
  });
  console.log('Result 2:', obj2);
  const errors2 = validateSync(obj2);
  console.log('Errors 2:', errors2);

  console.log(
    '\nTesting ListAvailableApplicationsQueryDto (array of strings)...',
  );
  const obj3 = plainToInstance(ListAvailableApplicationsQueryDto, {
    formTagIds: ['249', '250'],
  });
  console.log('Result 3:', obj3);
  const errors3 = validateSync(obj3);
  console.log('Errors 3:', errors3);
}

function testApprovalRequestDtoValidation() {
  console.log('\n--- Testing ApprovalRequestDto Validation ---');

  console.log('Testing valid ApprovalRequestDto (string value "approve")...');
  const obj1 = plainToInstance(ApprovalRequestDto, {
    approval_id: 'some-uuid-1',
    approval_result: 'approve',
    comment: 'Looks good 1',
  });
  console.log('Result 1:', obj1);
  const errors1 = validateSync(obj1);
  console.log('Errors 1:', errors1);

  console.log(
    '\nTesting valid ApprovalRequestDto (enum value direct usage ApprovalRequest.APPROVE)...',
  );
  const obj2 = plainToInstance(ApprovalRequestDto, {
    approval_id: 'some-uuid-2',
    approval_result: ApprovalRequest.APPROVE,
    comment: 'Looks good 2',
  });
  console.log('Result 2:', obj2);
  const errors2 = validateSync(obj2);
  console.log('Errors 2:', errors2);

  console.log('\nTesting invalid ApprovalRequestDto (unknown enum value)...');
  const obj3 = plainToInstance(ApprovalRequestDto, {
    approval_id: 'some-uuid-3',
    approval_result: 'invalid_status', // This should cause an error
    comment: 'Looks bad',
  });
  console.log('Result 3:', obj3);
  const errors3 = validateSync(obj3);
  console.log('Errors 3:', errors3);

  console.log(
    '\nTesting invalid ApprovalRequestDto (missing required fields)...',
  );
  const obj4 = plainToInstance(ApprovalRequestDto, {
    // approval_id missing
    // approval_result missing
    comment: 'Missing fields',
  });
  console.log('Result 4:', obj4);
  const errors4 = validateSync(obj4);
  console.log('Errors 4:', errors4);
}

testListAvailableApplicationsQueryDto();
testApprovalRequestDtoValidation();
