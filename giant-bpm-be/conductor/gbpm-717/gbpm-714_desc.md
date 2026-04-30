# GBPM 717: [Backend][Workflow]Admin is able to set a prefix for a workflow and workflow no shall be prefix with date & time

This requirement is about the 'generateAppSerialNumber' function in @application.service.ts (L90). Customers want to have customize format for each workflow.

## Current Implementation
Here is current implementation (in @application.service.ts)
``` ts
export function generateAppSerialNumber() {
  return `APP-${new Date().getTime()}`;
}
```
It's hard coding prefix 'APP-' and epoh time as sn

## New Implementation
The new request is we need allow admin to config prefix for each flow (eg. HR-, IT-, TPE-,....) and end the serial number with readable format yyyymmddxxxx (eg. 202601010001) here the yymmdd would be the issue date and xxxx should be the serial number (couting from 0001).
Therefore, I have a rough implementation idea for this feature.
We need provide following new API:
* An API to configure workflow prefix. For example, PUT workflow/<id>/preix, default value as APP-

Besides, we need to store the information into tables (2 options: standalone mapping table, new col in existing workflow table)

In the generateAppSerialNumber() funciton, we need to use the associated prefix, current date and instance number count to generate the serial number with new format.