import { ObjectId, Prop, RefId, PopulatedRef, Schema } from '@joktec/mongo';
import { BaseSchema } from '../common';
import { User } from './user.schema';

@Schema({
  collection: 'connections',
  unique: ['followerId,followeeId'],
  index: ['followerId', 'followeeId'],
  paranoid: true,
})
export class Connection extends BaseSchema {
  @Prop({ type: ObjectId, ref: () => User, required: true, comment: 'I am following someone' })
  followeeId?: RefId<User>;

  @Prop({ type: ObjectId, ref: () => User, required: true, comment: 'Someone is following me' })
  followerId?: RefId<User>;

  // Virtual
  @Prop({ ref: () => User, foreignField: '_id', localField: 'followerId' })
  follower?: PopulatedRef<User>;

  @Prop({ ref: () => User, foreignField: '_id', localField: 'followeeId' })
  followee?: PopulatedRef<User>;
}
