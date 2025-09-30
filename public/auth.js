
import { GoogleAuthProvider, signInWithPopup } from "firebase/auth";
import { auth } from "./firebaseClient";

export async function loginWithGoogle() {
  const provider = new GoogleAuthProvider();
  const result = await signInWithPopup(auth, provider);
  return result.user;
}
