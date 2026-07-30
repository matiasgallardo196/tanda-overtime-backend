import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsInt, IsOptional } from 'class-validator';
import { Type } from 'class-transformer';

export class OrgIdQueryDto {
  @ApiPropertyOptional({
    description:
      'Tanda organisation ID for the X-Organisation-Id header. If omitted, TANDA_DEFAULT_ORG_ID from .env is used.',
    example: 2000001,
  })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  orgId?: number;
}
