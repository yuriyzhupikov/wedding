import {
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
  @IsString()
  @MaxLength(500)
  message?: string;
}
