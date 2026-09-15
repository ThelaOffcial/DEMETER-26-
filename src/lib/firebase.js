import { initializeApp } from 'firebase/app'
import { getAuth } from 'firebase/auth'
import { getDatabase } from 'firebase/database'

const firebaseConfig = {
  apiKey: 'AIzaSyC53ALBwvxPueJgFK8pyPW4L-fe7BJypQQ',
  authDomain: 'cse-analise.firebaseapp.com',
  databaseURL: 'https://cse-analise-default-rtdb.asia-southeast1.firebasedatabase.app',
  projectId: 'cse-analise',
  storageBucket: 'cse-analise.firebasestorage.app',
  messagingSenderId: '757658375864',
  appId: '1:757658375864:web:a8e237963d9a6933b5864d',
  measurementId: 'G-NPCR5HMMV0',
}

const app = initializeApp(firebaseConfig)
export const auth = getAuth(app)
export const db = getDatabase(app)
export default app
