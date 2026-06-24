import { IsDate, Type } from '@joktec/utils';

export function DateColumn(): PropertyDecorator[] {
  return [Type(() => Date), IsDate()];
}
