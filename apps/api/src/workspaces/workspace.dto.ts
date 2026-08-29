import { IsString, MaxLength, MinLength } from "class-validator";

export class CreateWorkspaceDto {
  @IsString()
  @MinLength(2)
  @MaxLength(80)
  name!: string;
}

export class CreateProjectDto {
  @IsString()
  @MinLength(2)
  @MaxLength(80)
  name!: string;
}
