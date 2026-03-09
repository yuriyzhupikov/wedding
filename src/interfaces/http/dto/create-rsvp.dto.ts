import {
  ArrayMaxSize,
  IsArray,
  IsBoolean,
  IsInt,
  IsNotEmpty,
  IsOptional,
  IsString,
  MaxLength,
  Min,
} from 'class-validator';

export class CreateRsvpDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(80)
  fullName!: string;

  @IsBoolean()
  attending!: boolean;

  @IsOptional()
  @IsString()
  @MaxLength(30)
  phone?: string;

  @IsOptional()
  @IsInt()
  @Min(1)
  guestsCount?: number;

  @IsOptional()
  @IsBoolean()
  plusOne?: boolean;

  @IsOptional()
  @IsString()
  @MaxLength(80)
  partnerName?: string;

  @IsOptional()
  @IsBoolean()
  withChildren?: boolean;

  @IsOptional()
  @IsString()
  @MaxLength(160)
  childrenDetails?: string;

  @IsOptional()
  @IsArray()
  @ArrayMaxSize(6)
  @IsString({ each: true })
  @MaxLength(40, { each: true })
  drinks?: string[];

  @IsOptional()
  @IsString()
  @MaxLength(300)
  allergyDetails?: string;

  @IsOptional()
  @IsString()
  @MaxLength(500)
  message?: string;
}
