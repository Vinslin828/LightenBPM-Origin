/* eslint-disable @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-call, @typescript-eslint/no-unsafe-return, @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-unsafe-argument */
import { BadRequestException } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { MigrationService } from './migration.service';
import { PrismaService } from '../prisma/prisma.service';
import { FormRepository } from '../form/repositories/form.repository';
import { TagRepository } from '../tag/repositories/tag.repository';
import { ValidationRegistryRepository } from '../validation-registry/repositories/validation-registry.repository';
import { ValidationComponentMappingRepository } from '../validation-registry/repositories/validation-component-mapping.repository';
import { WorkflowRepository } from '../workflow/repositories/workflow.repository';
import { WorkflowOptionsRepository } from '../workflow/repositories/workflow-options.repository';
import { UserRepository } from '../user/repository/user.repository';
import { OrgUnitRepository } from '../org-unit/repository/org-unit.repository';
import { FormWorkflowBindingRepository } from '../form-workflow-binding/repositories/form-workflow-binding.repository';
import { FormSchema } from '../flow-engine/types';

describe('MigrationService', () => {
  let service: MigrationService;

  const mockPrismaService = {
    $transaction: jest.fn((cb: any) => cb(mockPrismaService)),
  };

  const mockFormRepository = {
    findByPublicId: jest.fn(),
    create: jest.fn(),
    createRevision: jest.fn(),
    updateRevision: jest.fn(),
    archiveActiveRevisions: jest.fn(),
    findLatestRevision: jest.fn(),
    updateTags: jest.fn(),
  };

  const mockTagRepository = { create: jest.fn() };
  const mockValidationRegistryRepository = {
    findByPublicId: jest.fn(),
    findByName: jest.fn(),
    create: jest.fn(),
  };
  const mockValidationComponentMappingRepository = {
    findByValidationId: jest.fn(),
    deleteAllByValidationId: jest.fn(),
    create: jest.fn(),
  };
  const mockWorkflowRepository = {
    findWorkflowWithLatestRevision: jest.fn(),
    updateWorkflowRevision: jest.fn(),
    archiveActiveWorkflowRevisions: jest.fn(),
  };
  const mockWorkflowOptionsRepository = {};
  const mockUserRepository = {
    findUserById: jest.fn(),
    findUserByCode: jest.fn(),
  };
  const mockOrgUnitRepository = {
    findOrgUnitById: jest.fn(),
    findOrgUnitByCode: jest.fn(),
  };
  const mockBindingRepository = {};

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        MigrationService,
        { provide: PrismaService, useValue: mockPrismaService },
        { provide: FormRepository, useValue: mockFormRepository },
        { provide: TagRepository, useValue: mockTagRepository },
        {
          provide: ValidationRegistryRepository,
          useValue: mockValidationRegistryRepository,
        },
        {
          provide: ValidationComponentMappingRepository,
          useValue: mockValidationComponentMappingRepository,
        },
        { provide: WorkflowRepository, useValue: mockWorkflowRepository },
        {
          provide: WorkflowOptionsRepository,
          useValue: mockWorkflowOptionsRepository,
        },
        { provide: UserRepository, useValue: mockUserRepository },
        { provide: OrgUnitRepository, useValue: mockOrgUnitRepository },
        {
          provide: FormWorkflowBindingRepository,
          useValue: mockBindingRepository,
        },
      ],
    }).compile();

    service = module.get<MigrationService>(MigrationService);
  });

  afterEach(() => jest.clearAllMocks());

  // ---------------------------------------------------------------------------
  // extractMasterDataReferences
  // ---------------------------------------------------------------------------

  describe('extractMasterDataReferences', () => {
    const call = (schema: FormSchema): string[] =>
      (service as any).extractMasterDataReferences(schema);

    it('should extract datasourceType.table.tableKey from a dynamic dropdown', () => {
      const schema: FormSchema = {
        root: ['field-1'],
        entities: {
          'field-1': {
            type: 'dropdown',
            attributes: {
              name: 'drp',
              datasourceType: {
                type: 'dynamic',
                table: {
                  tableKey: 'MY_DATASET',
                  labelKey: 'name',
                  valueKey: 'code',
                },
              },
            } as any,
          },
        },
      };
      expect(call(schema)).toContain('MY_DATASET');
    });

    it('should extract datasource.table.tableKey (alternate key name)', () => {
      const schema: FormSchema = {
        root: ['field-1'],
        entities: {
          'field-1': {
            type: 'dropdown',
            attributes: {
              name: 'drp',
              datasource: {
                type: 'dynamic',
                table: {
                  tableKey: 'OTHER_DATASET',
                  labelKey: 'name',
                  valueKey: 'id',
                },
              },
            } as any,
          },
        },
      };
      expect(call(schema)).toContain('OTHER_DATASET');
    });

    it('should not extract from static datasource', () => {
      const schema: FormSchema = {
        root: ['field-1'],
        entities: {
          'field-1': {
            type: 'dropdown',
            attributes: {
              name: 'drp',
              datasourceType: {
                type: 'static',
                table: {
                  tableKey: 'SHOULD_NOT_APPEAR',
                  labelKey: 'name',
                  valueKey: 'id',
                },
              },
            } as any,
          },
        },
      };
      expect(call(schema)).not.toContain('SHOULD_NOT_APPEAR');
    });

    it('should still extract getMasterData() expression references (regression guard)', () => {
      const schema: FormSchema = {
        root: ['field-1'],
        entities: {
          'field-1': {
            type: 'dropdown',
            attributes: {
              name: 'drp',
              defaultValue: {
                isReference: true,
                reference: 'getMasterData("EXPR_DATASET").map(v => v.name)',
              },
            } as any,
          },
        },
      };
      expect(call(schema)).toContain('EXPR_DATASET');
    });

    it('should deduplicate tableKey and expression references to the same dataset', () => {
      const schema: FormSchema = {
        root: ['field-1', 'field-2'],
        entities: {
          'field-1': {
            type: 'dropdown',
            attributes: {
              name: 'drp1',
              datasourceType: {
                type: 'dynamic',
                table: {
                  tableKey: 'SHARED_DS',
                  labelKey: 'name',
                  valueKey: 'id',
                },
              },
              defaultValue: {
                isReference: true,
                reference: 'getMasterData("SHARED_DS").length',
              },
            } as any,
          },
          'field-2': {
            type: 'dropdown',
            attributes: {
              name: 'drp2',
              datasourceType: {
                type: 'dynamic',
                table: {
                  tableKey: 'SHARED_DS',
                  labelKey: 'name',
                  valueKey: 'id',
                },
              },
            } as any,
          },
        },
      };
      const result = call(schema);
      expect(result.filter((n) => n === 'SHARED_DS')).toHaveLength(1);
    });
  });

  // ---------------------------------------------------------------------------
  // remapValidatorIds
  // ---------------------------------------------------------------------------

  describe('remapValidatorIds', () => {
    const call = (schema: FormSchema, idMap: Map<string, string>) =>
      (service as any).remapValidatorIds(schema, idMap);

    it('should remap flat validator.validatorId', () => {
      const schema: FormSchema = {
        root: ['f1'],
        entities: {
          f1: {
            type: 'input',
            attributes: {
              name: 'field',
              validator: { validatorId: 'OLD_ID', required: false },
            } as any,
          },
        },
      };
      const idMap = new Map([['OLD_ID', 'NEW_ID']]);
      const result = call(schema, idMap);
      expect(result.entities.f1.attributes.validator.validatorId).toBe(
        'NEW_ID',
      );
    });

    it('should remap registryValidators[].validatorId (regression guard)', () => {
      const schema: FormSchema = {
        root: ['f1'],
        entities: {
          f1: {
            type: 'input',
            attributes: {
              name: 'field',
              validator: {
                registryValidators: [{ validatorId: 'SRC_ID' }],
              },
            } as any,
          },
        },
      };
      const idMap = new Map([['SRC_ID', 'TGT_ID']]);
      const result = call(schema, idMap);
      expect(
        result.entities.f1.attributes.validator.registryValidators[0]
          .validatorId,
      ).toBe('TGT_ID');
    });

    it('should remap both formats when both are present', () => {
      const schema: FormSchema = {
        root: ['f1'],
        entities: {
          f1: {
            type: 'input',
            attributes: {
              name: 'field',
              validator: {
                validatorId: 'FLAT_SRC',
                registryValidators: [{ validatorId: 'ARRAY_SRC' }],
              },
            } as any,
          },
        },
      };
      const idMap = new Map([
        ['FLAT_SRC', 'FLAT_TGT'],
        ['ARRAY_SRC', 'ARRAY_TGT'],
      ]);
      const result = call(schema, idMap);
      expect(result.entities.f1.attributes.validator.validatorId).toBe(
        'FLAT_TGT',
      );
      expect(
        result.entities.f1.attributes.validator.registryValidators[0]
          .validatorId,
      ).toBe('ARRAY_TGT');
    });

    it('should return schema unchanged when idMap is empty', () => {
      const schema: FormSchema = {
        root: ['f1'],
        entities: {
          f1: {
            type: 'input',
            attributes: {
              name: 'field',
              validator: { validatorId: 'SOME_ID' },
            } as any,
          },
        },
      };
      const result = call(schema, new Map());
      expect(result.entities.f1.attributes.validator.validatorId).toBe(
        'SOME_ID',
      );
    });
  });

  // ---------------------------------------------------------------------------
  // buildFormPayload — validator collection via mocked repository
  // ---------------------------------------------------------------------------

  describe('buildFormPayload — validator collection', () => {
    const fakeValidation = {
      id: 1,
      public_id: 'VAL_PUBLIC_ID',
      name: 'my_validator',
      validation_type: 'CODE',
      validation_code: 'function validate(v) { return true; }',
      error_message: 'Error',
    };

    const buildFormWithSchema = (schema: FormSchema) => ({
      public_id: 'FORM_PUB_ID',
      is_template: false,
      form_revisions: [
        {
          public_id: 'REV_PUB_ID',
          name: 'Rev 1',
          description: null,
          form_schema: schema,
          options: null,
        },
      ],
      form_tag: [],
      permissions: [],
    });

    beforeEach(() => {
      mockValidationRegistryRepository.findByPublicId.mockResolvedValue(
        fakeValidation,
      );
      mockValidationComponentMappingRepository.findByValidationId.mockResolvedValue(
        [],
      );
    });

    it('should collect flat validatorId from validator.validatorId', async () => {
      const schema: FormSchema = {
        root: ['f1'],
        entities: {
          f1: {
            type: 'input',
            attributes: {
              name: 'field',
              validator: { validatorId: 'VAL_PUBLIC_ID', required: false },
            } as any,
          },
        },
      };

      const result = await (service as any).buildFormPayload(
        buildFormWithSchema(schema),
      );

      expect(
        mockValidationRegistryRepository.findByPublicId,
      ).toHaveBeenCalledWith('VAL_PUBLIC_ID');
      expect(result.dependencies.validations).toHaveLength(1);
      expect(result.dependencies.validations[0].public_id).toBe(
        'VAL_PUBLIC_ID',
      );
    });

    it('should collect registryValidators[].validatorId (regression guard)', async () => {
      const schema: FormSchema = {
        root: ['f1'],
        entities: {
          f1: {
            type: 'input',
            attributes: {
              name: 'field',
              validator: {
                registryValidators: [{ validatorId: 'VAL_PUBLIC_ID' }],
              },
            } as any,
          },
        },
      };

      const result = await (service as any).buildFormPayload(
        buildFormWithSchema(schema),
      );

      expect(
        mockValidationRegistryRepository.findByPublicId,
      ).toHaveBeenCalledWith('VAL_PUBLIC_ID');
      expect(result.dependencies.validations).toHaveLength(1);
    });

    it('should set grantee_code for USER permissions', async () => {
      mockUserRepository.findUserById.mockResolvedValue({
        id: 65,
        code: 'carol.chen',
      });
      const form = {
        ...buildFormWithSchema({ root: [], entities: {} }),
        permissions: [
          { grantee_type: 'USER', grantee_value: '65', action: 'USE' },
        ],
      };

      const result = await (service as any).buildFormPayload(form);

      expect(mockUserRepository.findUserById).toHaveBeenCalledWith(65);
      expect(result.dependencies.permissions[0]).toMatchObject({
        grantee_type: 'USER',
        grantee_value: '65',
        grantee_code: 'carol.chen',
        action: 'USE',
      });
    });

    it('should set grantee_code to null for EVERYONE permissions', async () => {
      const form = {
        ...buildFormWithSchema({ root: [], entities: {} }),
        permissions: [
          { grantee_type: 'EVERYONE', grantee_value: '', action: 'VIEW' },
        ],
      };

      const result = await (service as any).buildFormPayload(form);

      expect(mockUserRepository.findUserById).not.toHaveBeenCalled();
      expect(result.dependencies.permissions[0]).toMatchObject({
        grantee_type: 'EVERYONE',
        grantee_code: null,
        action: 'VIEW',
      });
    });

    it('should include fe_validation in the exported payload', async () => {
      const feValidation = { rules: [{ field: 'email', type: 'required' }] };
      const form = {
        ...buildFormWithSchema({ root: [], entities: {} }),
        form_revisions: [
          {
            public_id: 'REV_PUB_ID',
            name: 'Rev 1',
            description: null,
            form_schema: { root: [], entities: {} },
            fe_validation: feValidation,
            options: null,
          },
        ],
      };

      const result = await (service as any).buildFormPayload(form);

      expect(result.latest_revision.fe_validation).toEqual(feValidation);
    });

    it('should export fe_validation as null when not set on the revision', async () => {
      const form = buildFormWithSchema({ root: [], entities: {} });

      const result = await (service as any).buildFormPayload(form);

      expect(result.latest_revision.fe_validation).toBeNull();
    });
  });

  // ---------------------------------------------------------------------------
  // checkPermissionGrantees
  // ---------------------------------------------------------------------------

  describe('checkPermissionGrantees', () => {
    const call = (permissions: any[], check: any) =>
      (service as any).checkPermissionGrantees(permissions, check);

    it('EVERYONE always reports EXISTS/INFO', async () => {
      const check = { permissions: [] };
      await call(
        [{ grantee_type: 'EVERYONE', grantee_code: null, action: 'VIEW' }],
        check,
      );
      expect(check.permissions[0]).toMatchObject({
        grantee_type: 'EVERYONE',
        grantee_code: null,
        action: 'VIEW',
        status: 'EXISTS',
        severity: 'INFO',
      });
    });

    it('USER with existing grantee_code reports EXISTS/INFO', async () => {
      mockUserRepository.findUserByCode.mockResolvedValue({ id: 10 });
      const check = { permissions: [] };
      await call(
        [{ grantee_type: 'USER', grantee_code: 'carol.chen', action: 'USE' }],
        check,
      );
      expect(check.permissions[0]).toMatchObject({
        status: 'EXISTS',
        severity: 'INFO',
      });
    });

    it('USER with missing grantee_code reports MISSING/WARNING', async () => {
      mockUserRepository.findUserByCode.mockResolvedValue(null);
      const check = { permissions: [] };
      await call(
        [{ grantee_type: 'USER', grantee_code: 'unknown.user', action: 'USE' }],
        check,
      );
      expect(check.permissions[0]).toMatchObject({
        status: 'MISSING',
        severity: 'WARNING',
      });
    });

    it('old payload (no grantee_code) reports MISSING/WARNING without lookup', async () => {
      const check = { permissions: [] };
      await call(
        [{ grantee_type: 'USER', grantee_code: null, action: 'USE' }],
        check,
      );
      expect(mockUserRepository.findUserByCode).not.toHaveBeenCalled();
      expect(check.permissions[0]).toMatchObject({
        status: 'MISSING',
        severity: 'WARNING',
      });
    });

    it('ORG_UNIT with missing grantee reports MISSING/WARNING', async () => {
      mockOrgUnitRepository.findOrgUnitByCode.mockResolvedValue(null);
      const check = { permissions: [] };
      await call(
        [
          {
            grantee_type: 'ORG_UNIT',
            grantee_code: 'Finance',
            action: 'VIEW',
          },
        ],
        check,
      );
      expect(check.permissions[0]).toMatchObject({
        status: 'MISSING',
        severity: 'WARNING',
      });
    });
  });

  // ---------------------------------------------------------------------------
  // bulkImport — default org guard (step 4)
  // ---------------------------------------------------------------------------

  describe('bulkImport — default org guard', () => {
    const creatorId = 1;

    const makeDto = (defaultOrgCode: string, isDeleted = false) => ({
      orgUnits: [],
      users: [
        {
          code: 'EMP001',
          name: 'Alice',
          jobGrade: 1,
          defaultOrgCode,
          isDeleted,
        },
      ],
      memberships: [],
    });

    let mockTx: any;

    beforeEach(() => {
      mockTx = {
        user: {
          findUnique: jest.fn().mockResolvedValue(null),
          update: jest.fn(),
        },
        orgUnit: { findUnique: jest.fn() },
        orgMembership: {
          findFirst: jest.fn().mockResolvedValue(null),
          create: jest.fn(),
          count: jest.fn().mockResolvedValue(1),
        },
        userDefaultOrg: { upsert: jest.fn(), deleteMany: jest.fn() },
      };
      mockPrismaService.$transaction.mockImplementation((cb: any) =>
        cb(mockTx),
      );
      (mockUserRepository as any).createUser = jest
        .fn()
        .mockResolvedValue({ id: 10, code: 'EMP001', deleted_at: null });
      (mockUserRepository as any).delete = jest.fn();
    });

    it('throws BadRequestException when defaultOrgCode org does not exist', async () => {
      mockTx.orgUnit.findUnique.mockResolvedValue(null);

      await expect(
        service.bulkImport(makeDto('DEPT001') as any, creatorId),
      ).rejects.toThrow(BadRequestException);
    });

    it('throws BadRequestException when defaultOrgCode org is soft-deleted', async () => {
      mockTx.orgUnit.findUnique.mockResolvedValue({
        id: 5,
        code: 'DEPT001',
        deleted_at: new Date(),
      });

      await expect(
        service.bulkImport(makeDto('DEPT001') as any, creatorId),
      ).rejects.toThrow(BadRequestException);
    });

    it('upserts userDefaultOrg when org is active and user has 2+ active memberships', async () => {
      mockTx.orgUnit.findUnique.mockResolvedValue({
        id: 5,
        code: 'DEPT001',
        deleted_at: null,
      });
      mockTx.orgMembership.count.mockResolvedValue(2);

      await service.bulkImport(makeDto('DEPT001') as any, creatorId);

      expect(mockTx.userDefaultOrg.upsert).toHaveBeenCalledWith(
        expect.objectContaining({
          create: { user_id: 10, org_unit_id: 5 },
          update: { org_unit_id: 5 },
        }),
      );
    });

    it('deletes userDefaultOrg when user has only 1 active membership', async () => {
      mockTx.orgUnit.findUnique.mockResolvedValue({
        id: 5,
        code: 'DEPT001',
        deleted_at: null,
      });
      mockTx.orgMembership.count.mockResolvedValue(1);

      await service.bulkImport(makeDto('DEPT001') as any, creatorId);

      expect(mockTx.userDefaultOrg.deleteMany).toHaveBeenCalledWith({
        where: { user_id: 10 },
      });
    });

    it('skips defaultOrgCode processing when user is deleted in same batch', async () => {
      mockTx.user.findUnique.mockResolvedValue({
        id: 10,
        code: 'EMP001',
        deleted_at: null,
      });

      await service.bulkImport(makeDto('DEPT001', true) as any, creatorId);

      expect(mockTx.orgUnit.findUnique).not.toHaveBeenCalled();
    });
  });

  // ---------------------------------------------------------------------------
  // resolvePermissionsForExecute
  // ---------------------------------------------------------------------------

  describe('resolvePermissionsForExecute', () => {
    const call = (permissions: any[]) =>
      (service as any).resolvePermissionsForExecute(permissions);

    it('EVERYONE is always written with empty grantee_value', async () => {
      const result = await call([
        {
          grantee_type: 'EVERYONE',
          grantee_value: '',
          grantee_code: null,
          action: 'VIEW',
        },
      ]);
      expect(result).toHaveLength(1);
      expect(result[0]).toMatchObject({ grantee_value: '', action: 'VIEW' });
    });

    it('USER with existing target is remapped to target internal ID', async () => {
      mockUserRepository.findUserByCode.mockResolvedValue({ id: 99 });
      const result = await call([
        {
          grantee_type: 'USER',
          grantee_value: '65',
          grantee_code: 'carol.chen',
          action: 'USE',
        },
      ]);
      expect(result).toHaveLength(1);
      expect(result[0].grantee_value).toBe('99');
    });

    it('USER with missing target is skipped', async () => {
      mockUserRepository.findUserByCode.mockResolvedValue(null);
      const result = await call([
        {
          grantee_type: 'USER',
          grantee_value: '65',
          grantee_code: 'ghost.user',
          action: 'USE',
        },
      ]);
      expect(result).toHaveLength(0);
    });

    it('USER without grantee_code (old payload) is skipped', async () => {
      const result = await call([
        {
          grantee_type: 'USER',
          grantee_value: '65',
          grantee_code: null,
          action: 'USE',
        },
      ]);
      expect(mockUserRepository.findUserByCode).not.toHaveBeenCalled();
      expect(result).toHaveLength(0);
    });

    it('ORG_UNIT with existing target is remapped to target internal ID', async () => {
      mockOrgUnitRepository.findOrgUnitByCode.mockResolvedValue({ id: 12 });
      const result = await call([
        {
          grantee_type: 'ORG_UNIT',
          grantee_value: '47',
          grantee_code: 'Finance',
          action: 'VIEW',
        },
      ]);
      expect(result).toHaveLength(1);
      expect(result[0].grantee_value).toBe('12');
    });

    it('mixed permissions: writes EVERYONE + found USER, skips missing ORG_UNIT', async () => {
      mockUserRepository.findUserByCode.mockResolvedValue({ id: 99 });
      mockOrgUnitRepository.findOrgUnitByCode.mockResolvedValue(null);
      const result = await call([
        {
          grantee_type: 'EVERYONE',
          grantee_value: '',
          grantee_code: null,
          action: 'VIEW',
        },
        {
          grantee_type: 'USER',
          grantee_value: '65',
          grantee_code: 'carol.chen',
          action: 'USE',
        },
        {
          grantee_type: 'ORG_UNIT',
          grantee_value: '47',
          grantee_code: 'GhostDept',
          action: 'USE',
        },
      ]);
      expect(result).toHaveLength(2);
      expect(result[0].grantee_type).toBe('EVERYONE');
      expect(result[1].grantee_value).toBe('99');
    });
  });
});
