import { IsBoolean } from '@joktec/utils';

export function BoolColumn(): PropertyDecorator[] {
  return [IsBoolean()];
}
