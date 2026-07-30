import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsBoolean, IsInt, IsOptional, Min } from 'class-validator';
import { ContentFilterDto } from './content-filter.dto';

export class ClockComplianceContentDto extends ContentFilterDto {
  @ApiProperty({
    example: true,
    description: "Include yesterday's flagged clock-in/out entries in the report",
  })
  @IsBoolean()
  enabled!: boolean;

  @ApiPropertyOptional({ example: 1, default: 1, description: 'Minutes of tolerance before flagging' })
  @IsOptional()
  @IsInt()
  @Min(0)
  toleranceMinutes?: number;
}
