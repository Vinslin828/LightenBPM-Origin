# Proposal: Add Frontend Validation Support to Form Revisions

## Problem
The frontend requires a way to store versioned, complex validation logic (JS snippets, cross-field dependencies, and event listeners) that is tightly coupled with a specific `FormRevision`. Currently, there is no dedicated place to store this logic, leading to potential mismatches between the form layout (`form_schema`) and its intended behavior.

## Solution
Add a new `fe_validation` JSON column to the `FormRevision` model. This column will act as a "black box" for the backend, which will persist and serve the data without processing it. This ensures that frontend logic is versioned alongside the layout.

## Scope
- **Database**: Add `fe_validation Json?` to the `FormRevision` table in `schema.prisma`.
- **DTOs**: Update `CreateFormRevisionDto`, `UpdateFormRevisionDto`, and response DTOs to include the new field.
- **Repository/Service**: Ensure the field is handled during CRUD operations for Form Revisions.
- **API**: Update the Form Management APIs to accept and return the `fe_validation` object.

## Non-Goals
- **Backend Execution**: The backend will NOT execute or validate the JS code within `fe_validation`.
- **Validation Registry Integration**: This change does not aim to link `fe_validation` to the existing `ValidationRegistry` table yet.

## Risks
- **Data Integrity**: Deleting a field in `form_schema` might break a reference in `fe_validation`. (Mitigation: Add a warning in documentation or a lightweight "reference check" in the future).
- **XSS/Security**: Storing raw JS strings. (Mitigation: Standardize sanitization on the Frontend before execution).
