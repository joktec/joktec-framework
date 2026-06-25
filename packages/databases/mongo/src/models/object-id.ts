import { mongoose, Ref } from '@typegoose/typegoose';
import { RefType } from 'mongoose';

export class ObjectId extends mongoose.Types.ObjectId {
  constructor(inputId?: string | ObjectId | Ref<any, RefType>) {
    super(inputId);
  }

  public static create(value?: string | ObjectId | Ref<any, RefType>): ObjectId {
    if (!value) return new ObjectId();
    return new ObjectId(value);
  }

  public static compare(
    first: string | ObjectId | Ref<any, RefType>,
    second: string | ObjectId | Ref<any, RefType>,
  ): boolean {
    if (!ObjectId.isValid(first) || !ObjectId.isValid(second)) return false;
    return new ObjectId(first).equals(second);
  }
}
