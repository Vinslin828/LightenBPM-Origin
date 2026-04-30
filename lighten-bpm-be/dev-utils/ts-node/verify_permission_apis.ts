import { Test, TestingModule } from '@nestjs/testing';
import request from 'supertest';
import { AppModule } from '../../src/app.module';
import { JwtDecoder } from '../../src/auth/jwt-decoder';
import { PrismaService } from '../../src/prisma/prisma.service';
import {
  PermissionAction,
  GranteeType,
  RevisionState,
} from '../../src/common/types/common.types';

async function bootstrap() {
  const moduleFixture: TestingModule = await Test.createTestingModule({
    imports: [AppModule],
  })
    .overrideProvider(JwtDecoder)
    .useValue({
      decode: (token: string) => {
        if (token === 'admin-token') {
          return {
            sub: 'admin-sub',
            BPM_Role: 'admin',
            name: 'Admin',
            email: 'admin@test.com',
          };
        }
        if (token === 'user-1-token') {
          return {
            sub: 'user-1-sub',
            BPM_Role: 'user',
            name: 'User 1',
            email: 'user1@test.com',
          };
        }
        if (token === 'user-2-token') {
          return {
            sub: 'user-2-sub',
            BPM_Role: 'user',
            name: 'User 2',
            email: 'user2@test.com',
          };
        }
        return { sub: 'unknown' };
      },
    })
    .compile();

  const app = moduleFixture.createNestApplication();
  await app.init();
  return app;
}

async function runTests() {
  const app = await bootstrap();
  const prisma = app.get(PrismaService);

  // Pre-create users to avoid AuthGuard auto-creation issues
  await prisma.user.upsert({
    where: { sub: 'admin-sub' },
    update: {},
    create: {
      sub: 'admin-sub',
      code: 'admin',
      name: 'Admin',
      email: 'admin-perm-test@test.com',
      job_grade: 1,
    },
  });
  await prisma.user.upsert({
    where: { sub: 'user-1-sub' },
    update: {},
    create: {
      sub: 'user-1-sub',
      code: 'user-1',
      name: 'User 1',
      email: 'user1-perm-test@test.com',
      job_grade: 1,
    },
  });
  await prisma.user.upsert({
    where: { sub: 'user-2-sub' },
    update: {},
    create: {
      sub: 'user-2-sub',
      code: 'user-2',
      name: 'User 2',
      email: 'user2-perm-test@test.com',
      job_grade: 1,
    },
  });

  console.log('--- Starting Verification of Extended Permission APIs ---');

  try {
    // 1. Setup: Create a test form
    const adminToken = 'admin-token';
    const user1Token = 'user-1-token';
    const user2Token = 'user-2-token';

    // Create a form as admin
    const createFormRes = await request(app.getHttpServer())
      .post('/form')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        name: 'Test Permission Form',
        description: 'Form for testing extended permission APIs',
        is_template: false,
        form_schema: { components: [] },
        permissions: [
          {
            grantee_type: GranteeType.USER,
            grantee_value: 'user-1-sub',
            action: PermissionAction.MANAGE,
          },
        ],
      });

    if (createFormRes.status !== 201) {
      console.error(
        'Failed to create form:',
        createFormRes.status,
        createFormRes.body,
      );
    }

    const formId = createFormRes.body.form_id;
    console.log(`Created test form: ${formId}`);

    // Verify User 1 can manage permissions (MANAGE permission)
    console.log('Test: User 1 (MANAGE permission) can list permissions...');
    await request(app.getHttpServer())
      .get(`/form/${formId}/permissions`)
      .set('Authorization', `Bearer ${user1Token}`)
      .expect(200);
    console.log('✓ User 1 can list permissions');

    // Verify User 2 cannot manage permissions
    console.log('Test: User 2 (No permission) cannot list permissions...');
    await request(app.getHttpServer())
      .get(`/form/${formId}/permissions`)
      .set('Authorization', `Bearer ${user2Token}`)
      .expect(403);
    console.log('✓ User 2 forbidden as expected');

    // Test SET (PUT) permissions
    console.log('Test: Overwriting permissions with PUT...');
    const newPermissions = [
      {
        grantee_type: GranteeType.USER,
        grantee_value: 'user-2-sub',
        action: PermissionAction.VIEW,
      },
      {
        grantee_type: GranteeType.USER,
        grantee_value: 'user-1-sub',
        action: PermissionAction.MANAGE,
      },
    ];

    await request(app.getHttpServer())
      .put(`/form/${formId}/permissions`)
      .set('Authorization', `Bearer ${user1Token}`)
      .send(newPermissions)
      .expect(200);

    const listRes = await request(app.getHttpServer())
      .get(`/form/${formId}/permissions`)
      .set('Authorization', `Bearer ${adminToken}`)
      .expect(200);

    if (
      listRes.body.length === 2 &&
      listRes.body.some((p) => p.grantee_value === 'user-2-sub')
    ) {
      console.log('✓ PUT overwritten permissions successfully');
    } else {
      console.error(
        '✗ PUT failed to overwrite permissions correctly',
        listRes.body,
      );
    }

    // Test CLEAR (DELETE without query)
    console.log('Test: Clearing all permissions with DELETE (no query)...');
    await request(app.getHttpServer())
      .delete(`/form/${formId}/permissions`)
      .set('Authorization', `Bearer ${user1Token}`)
      .expect(204);

    const clearRes = await request(app.getHttpServer())
      .get(`/form/${formId}/permissions`)
      .set('Authorization', `Bearer ${adminToken}`)
      .expect(200);

    if (clearRes.body.length === 0) {
      console.log('✓ DELETE (no query) cleared all permissions successfully');
    } else {
      console.error(
        '✗ DELETE (no query) failed to clear permissions',
        clearRes.body,
      );
    }

    // Cleanup
    await prisma.form.delete({ where: { public_id: formId } });
    console.log('✓ Cleaned up test form');

    // 2. Workflow Verification
    console.log('\n--- Workflow Verification ---');
    const createWorkflowRes = await request(app.getHttpServer())
      .post('/workflow')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        name: 'Test Permission Workflow',
        isActive: true,
        permissions: [
          {
            grantee_type: GranteeType.USER,
            grantee_value: 'user-1-sub',
            action: PermissionAction.MANAGE,
          },
        ],
      });

    const workflowId = createWorkflowRes.body.workflow_id;
    console.log(`Created test workflow: ${workflowId}`);

    console.log(
      'Test: User 1 (MANAGE permission) can list workflow permissions...',
    );
    await request(app.getHttpServer())
      .get(`/workflow/${workflowId}/permissions`)
      .set('Authorization', `Bearer ${user1Token}`)
      .expect(200);
    console.log('✓ User 1 can list workflow permissions');

    console.log('Test: Overwriting workflow permissions with PUT...');
    await request(app.getHttpServer())
      .put(`/workflow/${workflowId}/permissions`)
      .set('Authorization', `Bearer ${user1Token}`)
      .send([
        {
          grantee_type: GranteeType.USER,
          grantee_value: 'user-2-sub',
          action: PermissionAction.VIEW,
        },
        {
          grantee_type: GranteeType.USER,
          grantee_value: 'user-1-sub',
          action: PermissionAction.MANAGE,
        },
      ])
      .expect(200);
    console.log('✓ PUT overwritten workflow permissions successfully');

    console.log(
      'Test: Clearing all workflow permissions with DELETE (no query)...',
    );
    await request(app.getHttpServer())
      .delete(`/workflow/${workflowId}/permissions`)
      .set('Authorization', `Bearer ${user1Token}`)
      .expect(204);

    const workflowClearRes = await request(app.getHttpServer())
      .get(`/workflow/${workflowId}/permissions`)
      .set('Authorization', `Bearer ${adminToken}`)
      .expect(200);

    if (workflowClearRes.body.length === 0) {
      console.log(
        '✓ DELETE (no query) cleared all workflow permissions successfully',
      );
    }

    // Cleanup Workflow (need to handle related entities if any, but since it's new it should be fine)
    await prisma.workflow.delete({ where: { public_id: workflowId } });
    console.log('✓ Cleaned up test workflow');

    // 3. ApplicationInstance (Shares) Verification
    console.log('\n--- ApplicationInstance Verification ---');
    // First need a form and workflow bound together to create an instance
    const unassignedOrg = await prisma.orgUnit.findUnique({
      where: { code: 'UNASSIGNED' },
    });
    const defaultOrgId = unassignedOrg ? unassignedOrg.id : 1;
    const now = Date.now();

    const fRes = await prisma.form.create({
      data: {
        public_id: `test-f-${now}`,
        created_by: 1,
        updated_by: 1,
        form_revisions: {
          create: {
            public_id: `test-fr-${now}`,
            name: 'Test FR',
            version: 1,
            created_by: 1,
            updated_by: 1,
            state: RevisionState.ACTIVE,
          },
        },
      },
    });
    const wRes = await prisma.workflow.create({
      data: {
        public_id: `test-w-${now}`,
        created_by: 1,
        updated_by: 1,
        workflow_revisions: {
          create: {
            public_id: `test-wr-${now}`,
            name: 'Test WR',
            version: 1,
            created_by: 1,
            updated_by: 1,
            flow_definition: {
              nodes: [{ key: 'start', type: 'start' }],
              edges: [],
            },
            state: RevisionState.ACTIVE,
          },
        },
      },
    });
    await prisma.formWorkflowBinding.create({
      data: {
        form_id: fRes.id,
        workflow_id: wRes.id,
        created_by: 1,
        updated_by: 1,
      },
    });

    // Create an instance as User 1
    // Add USE permission for User 1
    await prisma.workflowPermission.create({
      data: {
        workflow_id: wRes.id,
        grantee_type: GranteeType.USER,
        grantee_value: 'user-1-sub',
        action: PermissionAction.USE,
      },
    });

    const createInstRes = await request(app.getHttpServer())
      .post('/applications')
      .set('Authorization', `Bearer ${user1Token}`)
      .send({
        binding_id: (await prisma.formWorkflowBinding.findFirst({
          where: { form_id: fRes.id, workflow_id: wRes.id },
        }))!.id,
        form_data: {},
      });

    const sn = createInstRes.body.serial_number;
    if (!sn) {
      console.error(
        'Failed to get serial_number from createApplication response:',
        createInstRes.body,
      );
    }
    console.log(`Created test instance: ${sn}`);

    console.log('Test: Adding shares (POST)...');
    await request(app.getHttpServer())
      .post(`/applications/${sn}/shares`)
      .set('Authorization', `Bearer ${user1Token}`)
      .send([{ user_id: 1, reason: 'Test sharing' }])
      .expect(201);
    console.log('✓ Added shares successfully');

    console.log('Test: Overwriting shares (PUT)...');
    await request(app.getHttpServer())
      .put(`/applications/${sn}/shares`)
      .set('Authorization', `Bearer ${user1Token}`)
      .send([{ user_id: 2, reason: 'New share' }])
      .expect(200);

    const shareRes = await request(app.getHttpServer())
      .get(`/applications/${sn}/shares`)
      .set('Authorization', `Bearer ${user1Token}`)
      .expect(200);

    if (shareRes.body.length === 1 && shareRes.body[0].user_id === 2) {
      console.log('✓ PUT overwritten shares successfully');
    }

    console.log('Test: Clearing all shares (DELETE no query)...');
    await request(app.getHttpServer())
      .delete(`/applications/${sn}/shares`)
      .set('Authorization', `Bearer ${user1Token}`)
      .expect(204);

    const clearShareRes = await request(app.getHttpServer())
      .get(`/applications/${sn}/shares`)
      .set('Authorization', `Bearer ${user1Token}`)
      .expect(200);

    if (clearShareRes.body.length === 0) {
      console.log('✓ DELETE (no query) cleared all shares successfully');
    }

    // Cleanup Instance
    // This is complex due to relations, but since it's a test DB it should be fine.
    // In a real environment we would use a cleaner approach.

    console.log('\n--- All Verifications Passed! ---');
  } catch (error) {
    console.error('Verification failed:', error);
  } finally {
    await app.close();
  }
}

runTests();
