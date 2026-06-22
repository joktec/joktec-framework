# @joktec/firebase

Firebase Admin integration package for JokTec applications.

## What It Provides

- `FirebaseModule` global Nest module.
- `FirebaseService` built on `AbstractClientService`.
- Firebase credential and app option config models.
- Firebase client interface.

## Install

```bash
yarn add @joktec/firebase
```

## Usage

```ts
import { FirebaseModule, FirebaseService } from '@joktec/firebase';

@Module({
  imports: [FirebaseModule],
})
export class AppModule {}
```

Configure the `firebase` section in the application config. Credentials may be supplied as a path or structured credential object. Do not commit real credential files.

## Development

```bash
yarn build --scope @joktec/firebase
yarn test --scope @joktec/firebase
```
