import { ApiProperty } from '@nestjs/swagger';
import { IsDateString } from 'class-validator';
import { OrgIdQueryDto } from './org-id-query.dto';

export class GetShiftsQueryDto extends OrgIdQueryDto {
  @ApiProperty({ description: 'From date (yyyy-MM-dd)', example: '2026-07-28' })
  @IsDateString()
  from!: string;

  @ApiProperty({ description: 'To date (yyyy-MM-dd)', example: '2026-08-03' })
  @IsDateString()
  to!: string;
}
