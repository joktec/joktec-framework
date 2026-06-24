import { describe, expect, it, beforeAll, afterAll } from '@jest/globals';
import mongoose, { Connection, Schema as MongooseSchema } from 'mongoose';
import { ParanoidPlugin, StrictReferencePlugin } from '../plugins';

const describeMongo = process.env.MONGO_INTEGRATION_URI ? describe : describe.skip;
const runId = `${Date.now()}_${process.pid}`;
const parentModelName = `MongoIntegrationParent_${runId}`;
const childModelName = `MongoIntegrationChild_${runId}`;

describeMongo('Mongo real integration', () => {
  let connection: Connection;
  let ParentModel: mongoose.Model<any>;
  let ChildModel: mongoose.Model<any>;

  beforeAll(async () => {
    connection = await mongoose.createConnection(process.env.MONGO_INTEGRATION_URI as string).asPromise();

    const parentSchema = new MongooseSchema(
      {
        name: String,
        deletedAt: { type: Date, default: null },
      },
      { collection: `mongo_integration_parents_${runId}` },
    );
    parentSchema.virtual('children', {
      ref: childModelName,
      localField: '_id',
      foreignField: 'parentId',
      strictRef: true,
    });
    parentSchema.plugin(StrictReferencePlugin);
    parentSchema.plugin(ParanoidPlugin, { deletedAt: { name: 'deletedAt', type: Date } });

    const childSchema = new MongooseSchema(
      {
        parentId: { type: mongoose.Schema.Types.ObjectId, ref: parentModelName, strictRef: true },
        parentIds: [{ type: mongoose.Schema.Types.ObjectId, ref: parentModelName, strictRef: true }],
      },
      { collection: `mongo_integration_children_${runId}` },
    );
    childSchema.plugin(StrictReferencePlugin);

    ParentModel = connection.model(parentModelName, parentSchema);
    ChildModel = connection.model(childModelName, childSchema);
  });

  afterAll(async () => {
    if (!connection) return;
    await Promise.allSettled([ParentModel?.deleteMany({}).exec(), ChildModel?.deleteMany({}).exec()]);
    await connection.close(true);
  });

  it('should enforce strict references on save and update operators', async () => {
    const parent = await ParentModel.create({ name: 'parent' });
    const child = await ChildModel.create({ parentId: parent._id, parentIds: [parent._id] });
    const missingId = new mongoose.Types.ObjectId();

    await expect(ChildModel.create({ parentId: missingId })).rejects.toThrow();
    await expect(ChildModel.updateOne({ _id: child._id }, { $set: { parentId: missingId } }).exec()).rejects.toThrow();
    await expect(
      ChildModel.updateOne({ _id: child._id }, { $addToSet: { parentIds: { $each: [missingId] } } }).exec(),
    ).rejects.toThrow();
  });

  it('should block parent deletion when strict virtual dependents exist', async () => {
    const parent = await ParentModel.create({ name: 'guarded-parent' });
    await ChildModel.create({ parentId: parent._id });

    await expect(ParentModel.deleteOne({ _id: parent._id }).exec()).rejects.toThrow();
  });

  it('should hide paranoid documents by default and allow explicit opt out', async () => {
    await ParentModel.create({ name: 'active' });
    await ParentModel.create({ name: 'deleted', deletedAt: new Date() });

    const activeItems = await ParentModel.find({ name: { $in: ['active', 'deleted'] } })
      .lean()
      .exec();
    const allItems = await ParentModel.find({ name: { $in: ['active', 'deleted'] } })
      .setOptions({ paranoid: false })
      .lean()
      .exec();

    expect(activeItems.map(item => item.name)).toEqual(['active']);
    expect(allItems.map(item => item.name).sort()).toEqual(['active', 'deleted']);
  });
});
