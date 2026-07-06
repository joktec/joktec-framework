import { toSingular } from '@joktec/utils';
import { startCase } from 'lodash';

export type CrudCommand = 'paginate' | 'detail' | 'create' | 'update' | 'delete';

export const normalizeResourceName = (name: string): string => startCase(toSingular(name));

export const getResourceCommand = (dtoName: string, action: CrudCommand): string => {
  return `${normalizeResourceName(dtoName)}.${action}`;
};

export const getSubResourceCommand = (parentDtoName: string, dtoName: string, action: CrudCommand): string => {
  return `${normalizeResourceName(parentDtoName)}.${normalizeResourceName(dtoName)}.${action}`;
};
