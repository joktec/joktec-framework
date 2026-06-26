import { describe, expect, it } from '@jest/globals';
import { IsString, plainToInstance, validateSync } from '@joktec/utils';
import { DECORATORS } from '@nestjs/swagger';
import { getModelForClass } from '@typegoose/typegoose';
import { buildIndex } from '../helpers';
import { IMongoPropOptions, IPropOptions, Prop, Schema } from '../decorators';
import { StringProps } from '../decorators/props';
import { PROP_DESIGN_TYPE_KEY } from '../mongo.constant';
import { ObjectId, PopulatedRef } from '../models';

const getSwaggerMetadata = (target: object, property: string): Record<string, any> => {
  return Reflect.getMetadata(DECORATORS.API_MODEL_PROPERTIES, target, property);
};

describe('Mongo decorators', () => {
  it('should build collection schema defaults without mutating caller options', () => {
    const schemaOptions = { strict: false };
    const customIndexes = [{ fields: { code: 1 as const }, options: { unique: true } }];
    const options = {
      schemaOptions,
      customIndexes,
      paranoid: { injectIndex: true },
    };

    @Schema(options)
    class DecoratorCollectionFixture {}

    const model = getModelForClass(DecoratorCollectionFixture);

    expect(model.collection.name).toBe('decorator_collection_fixtures');
    expect(model.schema.options.strict).toBe(false);
    expect(schemaOptions).toEqual({ strict: false });
    expect(customIndexes).toEqual([{ fields: { code: 1 }, options: { unique: true } }]);
    expect(buildIndex(options)[0]).toEqual(expect.any(Function));
  });

  it('should build embedded schemas without collection defaults', () => {
    @Schema({ kind: 'embedded' })
    class DecoratorEmbeddedFixture {}

    const model = getModelForClass(DecoratorEmbeddedFixture);

    expect(model.schema.options._id).toBe(false);
    expect(model.schema.options.timestamps).toBe(false);
  });

  it('should build subdocument schemas with id and timestamp defaults', () => {
    @Schema({ kind: 'subdocument' })
    class DecoratorSubdocumentFixture {}

    const model = getModelForClass(DecoratorSubdocumentFixture);

    expect(model.schema.options._id).toBe(true);
    expect(model.schema.options.timestamps).toBe(true);
  });

  it('should build phone validators from isPhone tuple options', () => {
    const opts = { isPhone: [true, 'invalid phone'] } as IPropOptions;

    expect(() => StringProps(opts, { isArray: false })).not.toThrow();
    expect(opts.validate).toEqual(expect.any(Function));
  });

  it('should build phone validators from isPhone object options', () => {
    const opts = { isPhone: { locale: 'vi-VN', strictMode: false, message: 'invalid phone' } } as IPropOptions;

    expect(() => StringProps(opts, { isArray: false })).not.toThrow();
    expect(opts.validate).toEqual(expect.any(Function));
  });

  it('should default enum props to a concrete mongoose type unless explicitly overridden', () => {
    enum ArticleStatus {
      Draft = 'draft',
      Published = 'published',
    }

    class EnumPropFixture {
      @Prop({ enum: ArticleStatus })
      status?: ArticleStatus;

      @Prop({ type: String, enum: ArticleStatus })
      storedAsString?: ArticleStatus;
    }

    const model = getModelForClass(EnumPropFixture);
    const statusPath = model.schema.path('status') as any;
    const storedAsStringPath = model.schema.path('storedAsString') as any;

    expect(statusPath.instance).toEqual('String');
    expect(storedAsStringPath.instance).toEqual('String');
    expect(getSwaggerMetadata(EnumPropFixture.prototype, 'status').enum).toEqual(Object.values(ArticleStatus));

    const invalid = new EnumPropFixture();
    invalid.status = 'archived' as ArticleStatus;
    expect(validateSync(invalid).map(error => error.property)).toContain('status');

    const valid = new EnumPropFixture();
    valid.status = ArticleStatus.Draft;
    valid.storedAsString = ArticleStatus.Published;
    expect(validateSync(valid)).toHaveLength(0);
  });

  it('should resolve class factories for nested object and array props', () => {
    class PreferenceFixture {
      @IsString()
      theme?: string;
    }

    class UserFixture {
      @Prop({ type: () => PreferenceFixture, nested: true } as any)
      preference?: PreferenceFixture;

      @Prop({ type: () => [PreferenceFixture], nested: true } as any)
      preferences?: PreferenceFixture[];
    }

    const fixture = plainToInstance(UserFixture, {
      preference: { theme: 'dark' },
      preferences: [{ theme: 'light' }],
    });

    expect(fixture.preference).toBeInstanceOf(PreferenceFixture);
    expect(fixture.preferences[0]).toBeInstanceOf(PreferenceFixture);
    expect(Reflect.getMetadata(PROP_DESIGN_TYPE_KEY, UserFixture.prototype, 'preference')).toBe(PreferenceFixture);
    expect(Reflect.getMetadata(PROP_DESIGN_TYPE_KEY, UserFixture.prototype, 'preferences')).toBe(PreferenceFixture);
    expect(validateSync(fixture)).toHaveLength(0);

    const invalid = plainToInstance(UserFixture, {
      preference: { theme: 1 },
      preferences: [{ theme: 2 }],
    });
    expect(validateSync(invalid).map(error => error.property)).toEqual(['preference', 'preferences']);
  });

  it('should keep lazy class factories unresolved until transform time', () => {
    let ArtistFixture: any;
    let UserFixture: any;

    class ArticleFixture {
      @Prop({ type: () => [ArtistFixture], nested: true } as any)
      artists?: any[];
    }

    class ArtistClassFixture {
      name?: string;

      @Prop({ type: () => UserFixture, nested: true } as any)
      author?: any;

      get displayName(): string {
        return `artist:${this.name}`;
      }
    }

    class UserClassFixture {
      name?: string;

      get displayName(): string {
        return `user:${this.name}`;
      }
    }

    ArtistFixture = ArtistClassFixture;
    UserFixture = UserClassFixture;

    const fixture = plainToInstance(ArticleFixture, {
      artists: [{ name: 'artist1', author: { name: 'user1' } }],
    });

    expect(fixture.artists[0]).toBeInstanceOf(ArtistClassFixture);
    expect(fixture.artists[0].author).toBeInstanceOf(UserClassFixture);
    expect(fixture.artists[0].displayName).toBe('artist:artist1');
    expect(fixture.artists[0].author.displayName).toBe('user:user1');
  });

  it('should support populated reference aliases without losing lazy prop metadata', () => {
    class AuthorFixture {
      name!: string;
    }

    class ArticleFixture {
      @Prop({ type: () => AuthorFixture, ref: () => AuthorFixture, justOne: true } as any)
      author?: PopulatedRef<AuthorFixture>;

      @Prop({ type: () => [AuthorFixture], ref: () => AuthorFixture } as any)
      authors?: PopulatedRef<AuthorFixture>[];
    }

    const article = plainToInstance(ArticleFixture, {
      author: { name: 'single' },
      authors: [{ name: 'array' }],
    });
    const authorName: string | undefined = article.author?.name;
    const firstAuthorName: string | undefined = article.authors?.[0]?.name;

    expect(authorName).toBe('single');
    expect(firstAuthorName).toBe('array');
    expect(article.author).toBeInstanceOf(AuthorFixture);
    expect(article.authors?.[0]).toBeInstanceOf(AuthorFixture);
    expect(Reflect.getMetadata(PROP_DESIGN_TYPE_KEY, ArticleFixture.prototype, 'author')).toBe(AuthorFixture);
    expect(Reflect.getMetadata(PROP_DESIGN_TYPE_KEY, ArticleFixture.prototype, 'authors')).toBe(AuthorFixture);
  });

  it('should validate ObjectId arrays and keep map props as plain objects', () => {
    class ObjectIdFixture {
      @Prop({ type: [ObjectId] })
      authorIds?: ObjectId[];

      @Prop({ kind: 'map', type: Object })
      snapshot?: Record<string, unknown>;

      @Prop({ kind: 'map', type: Object })
      metadata?: Record<string, unknown>;
    }

    const invalid = plainToInstance(ObjectIdFixture, {
      authorIds: ['not-object-id'],
      snapshot: { id: 'raw-snapshot-id' },
      metadata: { id: 'raw-metadata-id' },
    });
    expect(validateSync(invalid).map(error => error.property)).toEqual(['authorIds']);
    expect(invalid.snapshot).toEqual({ id: 'raw-snapshot-id' });
    expect(invalid.metadata).toEqual({ id: 'raw-metadata-id' });

    const valid = plainToInstance(ObjectIdFixture, {
      authorIds: ['507f1f77bcf86cd799439011'],
      snapshot: { id: 'raw-snapshot-id' },
    });
    expect(validateSync(valid)).toHaveLength(0);
  });

  it('should expose virtual getters without registering a persisted mongoose path', () => {
    class VirtualPropFixture {
      requests = [{ pc: 2 }, { pc: 3 }];

      @Prop({ kind: 'virtual', mode: 'getter', comment: 'Total request', example: 5 })
      get totalRequest(): number {
        return this.requests.reduce((total, request) => total + request.pc, 0);
      }
    }

    const model = getModelForClass(VirtualPropFixture);

    expect(model.schema.path('totalRequest')).toBeUndefined();
    expect(Reflect.getMetadata(PROP_DESIGN_TYPE_KEY, VirtualPropFixture.prototype, 'totalRequest')).toBe(Number);
    expect(new VirtualPropFixture().totalRequest).toEqual(5);
  });

  it('should infer virtual populate mode and one-to-one defaults from ref metadata', () => {
    class AuthorVirtualFixture {
      name!: string;
    }

    class ArticleVirtualFixture {
      @Prop({
        ref: () => AuthorVirtualFixture,
        localField: 'authorId',
        foreignField: '_id',
      } as IMongoPropOptions)
      author?: PopulatedRef<AuthorVirtualFixture>;

      @Prop({
        type: () => [AuthorVirtualFixture],
        ref: () => AuthorVirtualFixture,
        localField: 'authorIds',
        foreignField: '_id',
      } as IMongoPropOptions)
      authors?: PopulatedRef<AuthorVirtualFixture>[];
    }

    const model = getModelForClass(ArticleVirtualFixture);
    const fixture = plainToInstance(ArticleVirtualFixture, {
      author: { name: 'author' },
      authors: [{ name: 'author-array' }],
    });

    expect(model.schema.virtualpath('author')).toBeDefined();
    expect(model.schema.virtualpath('author')?.options.justOne).toBe(true);
    expect(model.schema.virtualpath('authors')).toBeDefined();
    expect(model.schema.virtualpath('authors')?.options.justOne).toBeUndefined();
    expect(fixture.author).toBeInstanceOf(AuthorVirtualFixture);
    expect(fixture.authors?.[0]).toBeInstanceOf(AuthorVirtualFixture);
    expect(fixture.author?.name).toBe('author');
    expect(fixture.authors?.[0]?.name).toBe('author-array');
    expect(Reflect.getMetadata(PROP_DESIGN_TYPE_KEY, ArticleVirtualFixture.prototype, 'author')).toBe(
      AuthorVirtualFixture,
    );
    expect(Reflect.getMetadata(PROP_DESIGN_TYPE_KEY, ArticleVirtualFixture.prototype, 'authors')).toBe(
      AuthorVirtualFixture,
    );
  });

  it('should keep virtual populate Swagger and transform metadata lazy', () => {
    let LazyAuthorFixture: any;

    class ArticleCircularVirtualFixture {
      @Prop({
        ref: () => LazyAuthorFixture,
        localField: 'authorId',
        foreignField: '_id',
      } as IMongoPropOptions)
      author?: PopulatedRef<any>;

      @Prop({
        type: () => [LazyAuthorFixture],
        ref: () => LazyAuthorFixture,
        localField: 'authorIds',
        foreignField: '_id',
      } as IMongoPropOptions)
      authors?: PopulatedRef<any>[];
    }

    class AuthorCircularVirtualFixture {
      name!: string;

      get displayName(): string {
        return `author:${this.name}`;
      }
    }

    LazyAuthorFixture = AuthorCircularVirtualFixture;

    const authorSwagger = getSwaggerMetadata(ArticleCircularVirtualFixture.prototype, 'author');
    const authorsSwagger = getSwaggerMetadata(ArticleCircularVirtualFixture.prototype, 'authors');

    expect(authorSwagger.type()).toBe(AuthorCircularVirtualFixture);
    expect(authorsSwagger.type()).toBe(AuthorCircularVirtualFixture);
    expect(authorsSwagger.isArray).toEqual(true);

    const fixture = plainToInstance(ArticleCircularVirtualFixture, {
      author: { name: 'one' },
      authors: [{ name: 'many' }],
    });

    expect(fixture.author).toBeInstanceOf(AuthorCircularVirtualFixture);
    expect(fixture.authors?.[0]).toBeInstanceOf(AuthorCircularVirtualFixture);
    expect(fixture.author?.displayName).toEqual('author:one');
    expect(fixture.authors?.[0]?.displayName).toEqual('author:many');
  });
});
