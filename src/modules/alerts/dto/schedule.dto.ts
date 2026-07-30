import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsArray, IsIn, IsOptional, IsString, Matches } from 'class-validator';

export class ScheduleDto {
  @ApiProperty({ example: '08:00', description: '24h time, HH:mm' })
  @Matches(/^([01]\d|2[0-3]):([0-5]\d)$/, { message: 'time must be in 24h HH:mm format' })
  time!: string;

  @ApiPropertyOptional({ example: 'Australia/Sydney', default: 'Australia/Sydney' })
  @IsOptional()
  @IsString()
  timezone?: string;

  @ApiProperty({
    example: [1, 2, 3, 4, 5],
    description: 'Days to send: 0=Sunday, 1=Monday, ... 6=Saturday',
  })
  @IsArray()
  @IsIn([0, 1, 2, 3, 4, 5, 6], { each: true })
  daysOfWeek!: number[];
}
