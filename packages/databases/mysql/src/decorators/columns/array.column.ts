import { IsArray } from '@joktec/utils';

export function ArrayColumn(): PropertyDecorator[] {
  return [IsArray()];
}
