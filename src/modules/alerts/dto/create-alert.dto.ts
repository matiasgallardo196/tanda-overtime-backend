import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsBoolean, IsNotEmpty, IsOptional, IsString, ValidateNested } from 'class-validator';
import { ScheduleDto } from './schedule.dto';
import { OvertimeContentDto } from './overtime-content.dto';
import { ClockComplianceContentDto } from './clock-compliance-content.dto';
import { RecipientDto } from './recipient.dto';

export class CreateAlertDto {
  @ApiProperty({ example: 'Daily manager digest' })
  @IsString()
  @IsNotEmpty()
  name!: string;

  @ApiPropertyOptional({ default: true })
  @IsOptional()
  @IsBoolean()
  enabled?: boolean;

  @ApiProperty({ type: ScheduleDto })
  @ValidateNested()
  @Type(() => ScheduleDto)
  schedule!: ScheduleDto;

  @ApiProperty({ type: OvertimeContentDto })
  @ValidateNested()
  @Type(() => OvertimeContentDto)
  overtime!: OvertimeContentDto;

  @ApiProperty({ type: ClockComplianceContentDto })
  @ValidateNested()
  @Type(() => ClockComplianceContentDto)
  clockCompliance!: ClockComplianceContentDto;

  @ApiProperty({ type: RecipientDto })
  @ValidateNested()
  @Type(() => RecipientDto)
  recipient!: RecipientDto;
}
