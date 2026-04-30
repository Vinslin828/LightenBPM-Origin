 Implementation Plan for Test Script Enhancement

  I recommend either creating a new script dev-utils/test-attachment-draft-flow.sh or significantly expanding the
  existing one. Below is the plan to enhance the testing coverage:

  1. Add Draft Flow Test Sequence
  Implement a sequence that follows the lifecycle of a draft attachment:
   - Draft Init: Call POST /attachments/drafts/init to get a draft_id.
   - Draft Presign: Call POST /attachments/drafts/:draft_id/presign-upload.
   - S3 Upload: Perform the PUT to S3 (same logic as existing script).
   - Draft Confirm: Call POST /attachments/drafts/:draft_id/confirm.
   - Draft List: Call GET /attachments/drafts/:draft_id and verify the file is present.

  2. Add Binding Verification (Integration Test)
  Since binding happens during submission, the script should:
   - Call the application submission API (POST /bpm/applications/submission) passing the draft_id obtained in Step
     1.
   - Wait for the serial_number to be returned.
   - Call GET /bpm/applications/:sn/attachments to verify the draft attachments have been successfully
     migrated/bound to the new instance.

  3. Add Admin API Tests
   - List Pending: Call GET /bpm/attachments/admin/pending to see files that haven't been confirmed.
   - Cleanup: (Optional) Call DELETE /bpm/attachments/admin/pending/:id to verify purge logic.

  4. Script Refactoring
   - Modularize Curl Calls: Create helper functions within the script for curl requests to reduce boilerplate.
   - Environment Detection: The script currently expects a serial_number. For the draft flow, it should be able to
     run without one (generating its own via init).

  Proposed Task List

   1. [ ] Create dev-utils/test-attachment-draft-flow.sh to focus specifically on the new functionality.
   2. [ ] Implement Draft Init & Upload logic.
   3. [ ] Implement Binding Check by integrating with a minimal application submission (requires a valid form_id
      and workflow_id).
   4. [ ] Update test-attachment-feature.sh to simplify the "confirm" payload, as the refactor moves metadata
      storage to the "presign" step (per confirm-upload.dto.ts changes).

  Would you like me to proceed with creating this new draft flow test script for you?
