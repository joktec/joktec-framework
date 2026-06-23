import { QueryOptions } from 'mongoose';

export const UPDATE_OPTIONS: QueryOptions = {
  runValidators: true,
  returnDocument: 'after',
};

export const DELETE_OPTIONS: QueryOptions = {
  includeResultMetadata: false,
};

export const UPSERT_OPTIONS: QueryOptions = {
  upsert: true,
  returnDocument: 'after',
  runValidators: true,
  setDefaultsOnInsert: true,
};

export const PARANOID_OPTIONS: QueryOptions = {
  runValidators: true,
  returnDocument: 'after',
  paranoid: true,
};

export const RESTORE_OPTIONS: QueryOptions = {
  runValidators: true,
  returnDocument: 'after',
  paranoid: false,
};
