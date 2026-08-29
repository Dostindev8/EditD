import { Type } from "class-transformer";
import {
  IsBoolean,
  IsIn,
  IsNumber,
  IsOptional,
  IsString,
  MaxLength,
  MinLength,
  ValidateNested,
} from "class-validator";

export class SelectedOptionDto {
  @IsString()
  id!: string;

  @IsString()
  title!: string;

  @IsString()
  description!: string;

  @IsIn(["9:16", "1:1", "16:9"])
  aspectRatio!: "9:16" | "1:1" | "16:9";

  @IsNumber()
  durationSec!: number;

  @IsString()
  style!: string;

  @IsString()
  cameraMovement!: string;

  @IsString()
  platform!: string;

  @IsNumber()
  estimatedCostCents!: number;

  @IsString()
  prompt!: string;
}

export class SendMessageDto {
  @IsString()
  @MinLength(1)
  @MaxLength(8000)
  content!: string;

  @IsOptional()
  @IsString()
  assetId?: string;

  @IsOptional()
  @IsString()
  selectedOptionId?: string;

  @IsOptional()
  @ValidateNested()
  @Type(() => SelectedOptionDto)
  selectedOption?: SelectedOptionDto;

  @IsOptional()
  @IsBoolean()
  generateVideo?: boolean;

  @IsOptional()
  @IsIn(["es", "en"])
  locale?: "es" | "en";
}
