import { IsArray, IsBoolean, IsInt, IsNotEmpty, IsOptional, IsString, IsTypes, toArray } from '@joktec/utils';

export class BullBoardConfig {
  @IsOptional()
  @IsBoolean()
  enable?: boolean = true;

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  queues?: string[];

  @IsOptional()
  @IsString()
  path?: string = 'bulls';

  @IsOptional()
  @IsString()
  username?: string;

  @IsOptional()
  @IsString()
  password?: string;

  constructor(props?: Partial<BullBoardConfig>) {
    Object.assign(this, { ...props, queues: toArray<string>(props?.queues, { split: ',' }) });
    if (this.path && !this.path.startsWith('/')) this.path = `/${this.path}`;
  }
}

export class BullConfig {
  @IsNotEmpty()
  @IsString()
  host: string = 'localhost';

  @IsNotEmpty()
  @IsInt()
  port: number = 6379;

  @IsOptional()
  @IsString()
  username?: string;

  @IsOptional()
  @IsString()
  password?: string;

  @IsOptional()
  @IsInt()
  db?: number;

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  queues?: string[];

  @IsOptional()
  @IsTypes([BullBoardConfig])
  board?: BullBoardConfig;

  constructor(props: BullConfig) {
    Object.assign(this, {
      ...props,
      queues: toArray<string>(props?.queues, { split: ',' }),
      board: props?.board ? new BullBoardConfig(props.board) : null,
    });
  }
}
