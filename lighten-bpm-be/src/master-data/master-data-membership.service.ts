import {
  Injectable,
  BadRequestException,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { OrgUnitService } from '../org-unit/org-unit.service';
import { AssignType } from '../common/types/common.types';
import { MasterDataUtils } from './utils';
import { DatasetFieldDto } from './dto/create-dataset.dto';
import { SYSTEM_DATASETS, SYSTEM_DATASET_ORG_MEMBERSHIPS } from './constants';

interface MembershipRow {
  id: number;
  user_code: string;
  org_unit_code: string;
  assign_type: string;
  start_date: string;
  end_date: string;
  note?: string | null;
}

const SORT_COL_MAP: Record<string, string> = {
  id: 'om.id',
  user_code: 'u.code',
  org_unit_code: 'ou.code',
  assign_type: 'om.assign_type',
  start_date: 'om.start_date',
  end_date: 'om.end_date',
  note: 'om.note',
};

@Injectable()
export class MasterDataMembershipService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly orgUnitService: OrgUnitService,
  ) {}

  get fields(): DatasetFieldDto[] {
    return SYSTEM_DATASETS[SYSTEM_DATASET_ORG_MEMBERSHIPS].fields;
  }

  private formatRow(row: Record<string, unknown>): Record<string, unknown> {
    return {
      id: row.id as number,
      user_code: row.user_code as string,
      org_unit_code: row.org_unit_code as string,
      assign_type: row.assign_type as string,
      start_date:
        row.start_date instanceof Date
          ? row.start_date.toISOString()
          : (row.start_date as string),
      end_date:
        row.end_date instanceof Date
          ? row.end_date.toISOString()
          : (row.end_date as string),
      note: (row.note as string | null | undefined) ?? null,
    };
  }

  private buildWhere(filter: Record<string, unknown>): {
    whereSql: string;
    whereValues: unknown[];
  } {
    const whereValues: unknown[] = [];
    const whereClauses: string[] = [];

    for (const [key, val] of Object.entries(filter)) {
      if (key.startsWith('_')) continue;
      switch (key) {
        case 'id':
          whereValues.push(Number(val));
          whereClauses.push(`om.id = $${whereValues.length}`);
          break;
        case 'user_code':
          whereValues.push(val);
          whereClauses.push(`u.code = $${whereValues.length}`);
          break;
        case 'org_unit_code':
          whereValues.push(val);
          whereClauses.push(`ou.code = $${whereValues.length}`);
          break;
        case 'assign_type':
          whereValues.push(val);
          whereClauses.push(`om.assign_type = $${whereValues.length}`);
          break;
        case 'start_date':
          whereValues.push(val);
          whereClauses.push(`om.start_date = $${whereValues.length}`);
          break;
        case 'end_date':
          whereValues.push(val);
          whereClauses.push(`om.end_date = $${whereValues.length}`);
          break;
        default:
          throw new BadRequestException(
            `Field "${key}" is not a valid filter for memberships.`,
          );
      }
    }

    const whereSql =
      whereClauses.length > 0 ? `WHERE ${whereClauses.join(' AND ')}` : '';
    return { whereSql, whereValues };
  }

  async findRecords(
    filter: Record<string, unknown> = {},
    page = 1,
    limit = 10,
    sortField?: string,
    sortOrder: 'asc' | 'desc' = 'desc',
  ) {
    const { whereSql, whereValues } = this.buildWhere(filter);
    const sortCol =
      sortField && SORT_COL_MAP[sortField] ? SORT_COL_MAP[sortField] : 'om.id';
    const sortDir = sortOrder.toUpperCase();

    const baseFrom = `
      FROM org_memberships om
      JOIN users u ON u.id = om.user_id
      JOIN org_units ou ON ou.id = om.org_unit_id
      ${whereSql}
    `;

    const countSql = `SELECT COUNT(*) ${baseFrom}`;
    const countResult = await this.prisma.$queryRawUnsafe<{ count: bigint }[]>(
      countSql,
      ...(whereValues as any[]),
    );
    const total = Number(countResult[0].count);

    const offset = (page - 1) * limit;
    const limitIdx = whereValues.length + 1;
    const offsetIdx = whereValues.length + 2;

    const itemsSql = `
      SELECT om.id, u.code AS user_code, ou.code AS org_unit_code,
             om.assign_type, om.start_date, om.end_date, om.note
      ${baseFrom}
      ORDER BY ${sortCol} ${sortDir}
      LIMIT $${limitIdx} OFFSET $${offsetIdx}
    `;

    const rawItems = await this.prisma.$queryRawUnsafe<Record<string, unknown>[]>(
      itemsSql,
      ...(whereValues as any[]),
      limit,
      offset,
    );

    return {
      items: rawItems.map((r) => this.formatRow(r)),
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    };
  }

  async exportAllRecords(): Promise<{
    fields: DatasetFieldDto[];
    rows: Record<string, unknown>[];
  }> {
    const rows = await this.prisma.$queryRawUnsafe<Record<string, unknown>[]>(`
      SELECT om.id, u.code AS user_code, ou.code AS org_unit_code,
             om.assign_type, om.start_date, om.end_date, om.note
      FROM org_memberships om
      JOIN users u ON u.id = om.user_id
      JOIN org_units ou ON ou.id = om.org_unit_id
      ORDER BY om.id ASC
    `);

    return {
      fields: this.fields,
      rows: rows.map((r) => this.formatRow(r)),
    };
  }

  async createRecord(
    data: Record<string, unknown>,
    userId: number,
  ): Promise<Record<string, unknown>> {
    const { user_code, org_unit_code, assign_type, start_date, end_date, note } =
      data;

    if (!user_code || !org_unit_code || !assign_type || !start_date || !end_date) {
      throw new BadRequestException(
        'user_code, org_unit_code, assign_type, start_date, end_date are required.',
      );
    }

    if (!Object.values(AssignType).includes(assign_type as AssignType)) {
      throw new BadRequestException(
        `assign_type must be one of: ${Object.values(AssignType).join(', ')}`,
      );
    }

    const user = await this.prisma.user.findUnique({
      where: { code: user_code as string },
    });
    if (!user) {
      throw new BadRequestException(`User with code "${user_code}" not found.`);
    }

    const result = await this.orgUnitService.createOrgMembership(
      {
        orgUnitCode: org_unit_code as string,
        userId: user.id,
        assignType: assign_type as AssignType,
        startDate: new Date(start_date as string),
        endDate: new Date(end_date as string),
        isIndefinite: false,
        note: (note as string | undefined) ?? undefined,
      },
      userId,
    );

    return {
      id: result.id,
      user_code,
      org_unit_code,
      assign_type: result.assignType,
      start_date: result.startDate,
      end_date: result.endDate,
      note: result.note ?? null,
    };
  }

  async updateRecord(
    id: number,
    data: Record<string, unknown>,
    _userId: number,
  ): Promise<Record<string, unknown>> {
    const updateDto: {
      userId?: number;
      orgUnitCode?: string;
      assignType?: AssignType;
      startDate?: Date;
      endDate?: Date;
      note?: string;
    } = {};

    if (data.user_code) {
      const user = await this.prisma.user.findUnique({
        where: { code: data.user_code as string },
      });
      if (!user) {
        throw new BadRequestException(
          `User with code "${data.user_code}" not found.`,
        );
      }
      updateDto.userId = user.id;
    }
    if (data.org_unit_code) updateDto.orgUnitCode = data.org_unit_code as string;
    if (data.assign_type) updateDto.assignType = data.assign_type as AssignType;
    if (data.start_date)
      updateDto.startDate = new Date(data.start_date as string);
    if (data.end_date) updateDto.endDate = new Date(data.end_date as string);
    if (data.note !== undefined) updateDto.note = data.note as string;

    await this.orgUnitService.updateOrgMembership(id, updateDto);

    const updated = await this.prisma.$queryRawUnsafe<Record<string, unknown>[]>(
      `SELECT om.id, u.code AS user_code, ou.code AS org_unit_code,
              om.assign_type, om.start_date, om.end_date, om.note
       FROM org_memberships om
       JOIN users u ON u.id = om.user_id
       JOIN org_units ou ON ou.id = om.org_unit_id
       WHERE om.id = $1`,
      id,
    );

    if (updated.length === 0) throw new NotFoundException(`Membership ${id} not found after update.`);
    return this.formatRow(updated[0]);
  }

  async deleteRecord(id: number): Promise<Record<string, unknown>> {
    const existing = await this.prisma.$queryRawUnsafe<Record<string, unknown>[]>(
      `SELECT om.id, u.code AS user_code, ou.code AS org_unit_code,
              om.assign_type, om.start_date, om.end_date, om.note
       FROM org_memberships om
       JOIN users u ON u.id = om.user_id
       JOIN org_units ou ON ou.id = om.org_unit_id
       WHERE om.id = $1`,
      id,
    );

    if (existing.length === 0) {
      throw new NotFoundException(`Membership with ID ${id} not found.`);
    }

    await this.orgUnitService.hardDeleteOrgMembership(id);
    return this.formatRow(existing[0]);
  }

  async importCsvRecords(
    fileBuffer: Buffer,
    userId: number,
  ): Promise<{ inserted: number; errors: string[] }> {
    const { headers, rows } = MasterDataUtils.parseCsv(fileBuffer);

    if (rows.length === 0) return { inserted: 0, errors: [] };

    const allowedHeaders = new Set([
      'user_code',
      'org_unit_code',
      'assign_type',
      'start_date',
      'end_date',
      'note',
    ]);
    const insertHeaders = headers.filter((h) => h !== 'id');
    for (const h of insertHeaders) {
      if (!allowedHeaders.has(h)) {
        throw new BadRequestException(
          `CSV column "${h}" is not valid for membership import. Allowed: ${[...allowedHeaders].join(', ')}`,
        );
      }
    }

    const errors: string[] = [];
    let inserted = 0;

    for (let i = 0; i < rows.length; i++) {
      const row = rows[i];
      try {
        await this.createRecord(row as unknown as Record<string, unknown>, userId);
        inserted++;
      } catch (e) {
        errors.push(
          `Row ${i + 2}: ${e instanceof Error ? e.message : String(e)}`,
        );
      }
    }

    return { inserted, errors };
  }
}
