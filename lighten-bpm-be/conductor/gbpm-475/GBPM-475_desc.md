# [Backend][Form Builder]Allow application to upload attachment

## User Story

As an end user filling out a form,

I want to upload one or multiple files with drag-and-drop support and add remarks for each file,

so that I can provide supporting documents or attachments in an easy and structured way.

As a form system administrator or form designer,

I want to configure a File Upload component in the form builder,

so that I can control file upload behavior and display uploaded files clearly.

## Background / Context

In many form scenarios, users are required to upload supporting documents (e.g. images, PDFs, reports).

To improve usability and clarity, the File Upload component should support:

- Drag and drop upload
- Multiple file uploads
- Remarks (description) per uploaded file
- Sorting files by upload time

## Functional Spec

### 1) File Upload Component – Builder Settings

Basic Settings

- Component Name
  - System identifier (must be unique within the form)
- Label
  - Displayed field label on the form
- Required
  - Whether at least one file upload is required

### 2) Upload Configuration

Upload Method

- Drag & Drop
- Click to browse file
(Both are supported by default)

- Allow Multiple Files
  - Boolean (On / Off)
  - When enabled, end users can upload multiple files

- Maximum File Count
  - Optional
  - Limits the number of files a user can upload

- Supported File Types
  - Configurable list (e.g. PDF, JPG, PNG, DOCX, XLSX)
  - If not specified, all file types are allowed
- Maximum File Size
  - Optional
  - Per-file size limit

### 3) Uploaded File List Display

After files are uploaded, display a file list with the following columns:

- File Name
- Upload Time
  - System-generated timestamp
- Remark
  - Editable text field for end users
  - Optional
- Actions
  - Download
  - Remove (if allowed)

### 4) Sorting Behavior

- Default sorting:
  - Sort by Upload Time (Descending)
    - Latest uploaded file appears first
- Sorting is automatic and not configurable by end users in this ticket

### 5) End User Behavior

- End users can:
  - Drag and drop one or multiple files into the upload area
  - Upload files via file picker
  - Enter or edit a remark for each uploaded file
  - Remove uploaded files before form submission (if not restricted)

- File uploads:
  - Are associated with the form submission
  - Are not submitted until the form is successfully submitted

### Acceptance Criteria

- AC-1: Drag and Drop Upload
  - **GIVEN** a form contains a File Upload component
  - **WHEN** an end user drags and drops a file into the upload area
  - **THEN** the file is uploaded successfully and displayed in the file list

- AC-2: Multiple File Upload
  - **GIVEN** Allow Multiple Files is enabled
  - **WHEN** an end user uploads multiple files
  - **THEN** all uploaded files are displayed in the file list

- AC-3: Remark per File
  - **GIVEN** files have been uploaded
  - **WHEN** an end user enters a remark for a file
  - **THEN** the remark is saved and associated with that file

- AC-4: Upload Time Sorting
  - **GIVEN** multiple files are uploaded
  - **WHEN** the file list is displayed
  - **THEN** files are sorted by upload time in descending order by default

- AC-5: Required Validation
  - **GIVEN** the File Upload component is marked as Required
  - **WHEN** an end user submits the form without uploading any file
  - **THEN** the system shows a validation error and prevents submission

- AC-6: Remove Uploaded File
  - **GIVEN** a file has been uploaded
  - **WHEN** the end user removes the file before submission
  - **THEN** the file is removed from the list and not included in the submission

### Out of Scope / Notes

- No file versioning or history tracking
- No virus scanning or content validation in this ticket
- No permission control or role-based access
- No server-side file preview (download only)
