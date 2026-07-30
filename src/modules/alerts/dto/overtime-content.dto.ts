import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsBoolean, IsNumber, IsOptional, Min } from 'class-validator';
import { ContentFilterDto } from './content-filter.dto';

export class OvertimeContentDto extends ContentFilterDto {
  @ApiProperty({ example: true, description: 'Include the overtime section in the report' })
  @IsBoolean()
  enabled!: boolean;

  @ApiPropertyOptional({
    example: 38,
    default: 38,
    description: 'Only employees projected over this many hours this week are listed',
  })
  @IsOptional()
  @IsNumber()
  @Min(0)
  thresholdHours?: number;
}
