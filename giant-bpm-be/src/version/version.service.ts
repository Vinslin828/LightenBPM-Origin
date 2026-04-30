import { Injectable } from '@nestjs/common';
import { readFileSync } from 'fs';
import { join } from 'path';
import { VersionDto } from './version.dto';

@Injectable()
export class VersionService {
  private versionInfo: VersionDto;

  constructor() {
    try {
      const filePath = join(__dirname, '..', '..', '..', 'version.json');
      const fileContent = readFileSync(filePath, 'utf-8');
      this.versionInfo = JSON.parse(fileContent) as VersionDto;
    } catch {
      this.versionInfo = {
        version: -1,
        commitSha: 'unknown',
        buildDate: 'unknown',
        error: 'Could not read version.json file',
      };
    }
  }

  getVersionInfo(): VersionDto {
    return this.versionInfo;
  }
}
