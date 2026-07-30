import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsArray, IsInt, IsOptional } from 'class-validator';

/** null = no filter (include everyone/every department). An explicit array (even empty) restricts to exactly those IDs. */
export class ContentFilterDto {
  @ApiPropertyOptional({ type: [Number], nullable: true, example: null })
  @IsOptional()
  @IsArray()
  @IsInt({ each: true })
  departmentIds?: number[] | null;

  @ApiPropertyOptional({ type: [Number], nullable: true, example: null })
  @IsOptional()
  @IsArray()
  @IsInt({ each: true })
  employeeIds?: number[] | null;
}
