import { Capacitor } from '@capacitor/core'
import { FirebaseAuthentication } from '@capacitor-firebase/authentication'
import { initializeApp } from 'firebase/app'
import {
  browserPopupRedirectResolver,
  GoogleAuthProvider,
  indexedDBLocalPersistence,
  initializeAuth,
  onAuthStateChanged,
  signInWithCredential,
  signInWithPopup,
  signOut as firebaseSignOut,
  type User,
} from 'firebase/auth'
import { collection, doc, getDocsFromServer, initializeFirestore, writeBatch } from 'firebase/firestore'
import { useSyncExternalStore } from 'react'
import { db, type Workout } from '../db'

const app = initializeApp({
  apiKey: 'AIzaSyDMfSJ3X2oR8TIfpPBxS2a7K71YDL-aRv0',
  authDomain: 'jumptrack-app.firebaseapp.com',
  projectId: 'jumptrack-app',
  storageBucket: 'jumptrack-app.firebasestorage.app',
  messagingSenderId: '516673540226',
  appId: '1:516673540226:web:b8c4c53d4385348d7b649b',
})
// Sin el resolver de popups por defecto: en el WebView de Android no hay popups, el login va por el plugin nativo.
const auth = initializeAuth(app, { persistence: indexedDBLocalPersistence })
const firestore = initializeFirestore(app, { ignoreUndefinedProperties: true })

export interface CloudState {
  /** false mientras Firebase restaura la sesión guardada. */
  ready: boolean
  user: { name: string | null; email: string | null; photoUrl: string | null } | null
  syncing: boolean
  lastSyncAt: number | null
  error: string | null
}

let state: CloudState = { ready: false, user: null, syncing: false, lastSyncAt: null, error: null }
const listeners = new Set<() => void>()

function set(patch: Partial<CloudState>) {
  state = { ...state, ...patch }
  listeners.forEach((l) => l())
}

const subscribe = (listener: () => void) => {
  listeners.add(listener)
  return () => listeners.delete(listener)
}

export function useCloud(): CloudState {
  return useSyncExternalStore(subscribe, () => state)
}

/** Restaura la sesión y sincroniza al arrancar la app. */
export function initCloud() {
  onAuthStateChanged(auth, (user) => {
    set({ ready: true, user: user && { name: user.displayName, email: user.email, photoUrl: user.photoURL }, error: null })
    if (user) void syncWorkouts()
  })
}

export async function signInWithGoogle() {
  try {
    if (Capacitor.isNativePlatform()) {
      const result = await FirebaseAuthentication.signInWithGoogle()
      const idToken = result.credential?.idToken
      if (!idToken) throw new Error('Google no devolvió credenciales')
      await signInWithCredential(auth, GoogleAuthProvider.credential(idToken))
    } else {
      await signInWithPopup(auth, new GoogleAuthProvider(), browserPopupRedirectResolver)
    }
  } catch (e) {
    set({ error: errorMessage(e) })
  }
}

export async function signOut() {
  if (Capacitor.isNativePlatform()) await FirebaseAuthentication.signOut()
  await firebaseSignOut(auth)
  set({ lastSyncAt: null })
}

let running: Promise<void> | null = null
let rerun = false

/**
 * Une los entrenamientos locales con los de la nube.
 * Cada entrenamiento se identifica por su startedAt: el id de Dexie cambia entre dispositivos.
 * Las ediciones ganan por updatedAt; los borrados quedan marcados en la nube (`deleted`)
 * para que los otros dispositivos también los quiten.
 */
export function syncWorkouts(): Promise<void> {
  const user = auth.currentUser
  if (!user) return Promise.resolve()
  if (running) {
    rerun = true
    return running
  }
  set({ syncing: true, error: null })
  running = doSync(user)
    .then(() => set({ lastSyncAt: Date.now() }))
    .catch((e) => set({ error: errorMessage(e) }))
    .finally(() => {
      running = null
      set({ syncing: false })
      if (rerun) {
        rerun = false
        void syncWorkouts()
      }
    })
  return running
}

type RemoteWorkout = Omit<Workout, 'id'> & { deleted?: boolean }

async function doSync(user: User) {
  const ref = collection(firestore, 'users', user.uid, 'workouts')
  const [snapshot, local, deleted] = await Promise.all([getDocsFromServer(ref), db.workouts.toArray(), db.deletedWorkouts.toArray()])
  const remote = new Map(snapshot.docs.map((d) => [d.id, d.data() as RemoteWorkout]))
  const localByKey = new Map(local.map((w) => [String(w.startedAt), w]))
  const deletedKeys = new Set(deleted.map((d) => String(d.startedAt)))

  const uploads: [string, RemoteWorkout][] = deleted.map(({ startedAt }) => [
    String(startedAt),
    { startedAt, deleted: true, updatedAt: Date.now() } as RemoteWorkout,
  ])
  for (const { id: _id, ...w } of local) {
    const r = remote.get(String(w.startedAt))
    if (!r || (!r.deleted && (w.updatedAt ?? 0) > (r.updatedAt ?? 0))) uploads.push([String(w.startedAt), w])
  }
  // Firestore limita cada batch a 500 escrituras.
  for (let i = 0; i < uploads.length; i += 500) {
    const batch = writeBatch(firestore)
    for (const [key, data] of uploads.slice(i, i + 500)) batch.set(doc(ref, key), data)
    await batch.commit()
  }

  const toAdd: RemoteWorkout[] = []
  const toDelete: number[] = []
  const toUpdate: { key: number; changes: RemoteWorkout }[] = []
  for (const [key, r] of remote) {
    const l = localByKey.get(key)
    // Los borrados locales de esta pasada aún no están marcados en `remote`, que se leyó antes de subirlos.
    if (r.deleted || deletedKeys.has(key)) {
      if (l) toDelete.push(l.id)
    } else if (!l) toAdd.push(r)
    else if ((r.updatedAt ?? 0) > (l.updatedAt ?? 0)) toUpdate.push({ key: l.id, changes: r })
  }
  await db.transaction('rw', db.workouts, db.deletedWorkouts, async () => {
    await db.workouts.bulkAdd(toAdd as Workout[])
    await db.workouts.bulkDelete(toDelete)
    await db.workouts.bulkUpdate(toUpdate)
    await db.deletedWorkouts.bulkDelete(deleted.map((d) => d.startedAt))
  })
}

function errorMessage(e: unknown): string {
  const msg = e instanceof Error ? e.message : String(e)
  if (/cancel/i.test(msg)) return 'Inicio de sesión cancelado'
  if (/offline|unavailable|network/i.test(msg)) return 'Sin conexión, se sincronizará luego'
  return msg
}
