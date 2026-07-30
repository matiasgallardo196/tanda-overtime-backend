import { ApiProperty } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  ArrayMinSize,
  IsIn,
  IsNotEmpty,
  IsString,
  ValidateNested,
} from 'class-validator';
import { AlertChannelType } from '../interfaces/alert.interface';

export class ChannelDto {
  @ApiProperty({ enum: ['email', 'whatsapp', 'sms'] })
  @IsIn(['email', 'whatsapp', 'sms'])
  type!: AlertChannelType;

  @ApiProperty({
    example: 'manager@example.com',
    description: 'Email address, or E.164 phone number for whatsapp/sms (e.g. +61412345678)',
  })
  @IsString()
  @IsNotEmpty()
  destination!: string;
}

export class RecipientDto {
  @ApiProperty({ example: 'Venue Manager' })
  @IsString()
  @IsNotEmpty()
  name!: string;

  @ApiProperty({ type: [ChannelDto] })
  @ValidateNested({ each: true })
  @Type(() => ChannelDto)
  @ArrayMinSize(1)
  channels!: ChannelDto[];
}
