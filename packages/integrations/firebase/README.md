# @joktec/firebase

Firebase Admin integration package for JokTec applications.

`@joktec/firebase` wraps Firebase Admin SDK initialization with JokTec config parsing, lifecycle hooks, and typed accessors for Firebase app services.

## What It Provides

- `FirebaseModule` global Nest module.
- `FirebaseService` built on `AbstractClientService`.
- Firebase credential and app option config models.
- Firebase client interface.
- Accessors for Auth, Realtime Database, Messaging, Storage, and Firestore.

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

Inject `FirebaseService` into app services:

```ts
const user = await firebaseService.auth().getUser(uid);
await firebaseService.messaging().send({
  token,
  notification: { title: 'Welcome', body: 'Hello from JokTec' },
});
```

## Config

Configure the `firebase` section in the application config. Credentials may be supplied as a path or structured credential object.

```yaml
firebase:
  conId: default
  credential: ./_credentials/firebase-cert.json
  databaseURL: https://example.firebaseio.com
  storageBucket: example.appspot.com
  projectId: example-project
```

Structured credential object:

```yaml
firebase:
  conId: default
  credential:
    projectId: example-project
    clientEmail: firebase-adminsdk@example.iam.gserviceaccount.com
    privateKey: ${FIREBASE_PRIVATE_KEY}
```

## Guidelines

- Do not commit real service account JSON files or private keys.
- Use ignored local credential files or environment-specific secret injection.
- Keep Firebase domain workflows in the consuming app.
- Package tests mock `firebase-admin`; use live checks only in controlled integration environments.

## Development

```bash
yarn lint --scope @joktec/firebase
yarn build --scope @joktec/firebase
yarn test --scope @joktec/firebase
```
