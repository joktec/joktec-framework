import { mongoose, Ref } from '@typegoose/typegoose';
import { RefType } from 'mongoose';

export type ObjectIdInput = string | ObjectId | Ref<any, RefType> | { toHexString(): string };

export class ObjectId extends mongoose.Types.ObjectId {
  constructor(inputId?: ObjectIdInput) {
    super(ObjectId.toInputValue(inputId));
  }

  public static create(value?: ObjectIdInput): ObjectId {
    if (!value) return new ObjectId();
    return new ObjectId(value);
  }

  public static valid(value: unknown): boolean {
    if (!value) return false;
    if (ObjectId.isObjectId(value)) return true;
    return ObjectId.isValid(value as any);
  }

  public static isObjectId(value: unknown): boolean {
    if (!value) return false;
    if (value instanceof mongoose.Types.ObjectId) return true;

    const candidate = value as { _bsontype?: string; toHexString?: () => string };
    if (candidate._bsontype !== 'ObjectId' || typeof candidate.toHexString !== 'function') return false;
    return ObjectId.isValid(candidate.toHexString());
  }

  public static compare(first: ObjectIdInput, second: ObjectIdInput): boolean {
    if (!ObjectId.valid(first) || !ObjectId.valid(second)) return false;
    return new ObjectId(first).equals(second);
  }

  private static toInputValue(value?: ObjectIdInput): any {
    if (value && typeof (value as any).toHexString === 'function') return (value as any).toHexString();
    return value;
  }
}
