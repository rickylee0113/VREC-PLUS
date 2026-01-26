import { initializeApp } from 'firebase/app';
import { 
  getAuth, 
  GoogleAuthProvider, 
  signInWithPopup as firebaseSignInWithPopup, 
  signOut as firebaseSignOut, 
  onAuthStateChanged as firebaseOnAuthStateChanged,
  setPersistence,
  browserLocalPersistence,
  User as FirebaseUser 
} from 'firebase/auth';

// 安全地取得環境變數，若 import.meta.env 為 undefined 則使用空物件避免崩潰
const meta = import.meta as any;
const env = meta.env || {};

const firebaseConfig = {
  apiKey: env.VITE_FIREBASE_API_KEY,
  authDomain: env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: env.VITE_FIREBASE_APP_ID
};

let app;
let authInstance: any;
let provider: any;

try {
  // 檢查是否有 API Key
  if (!firebaseConfig.apiKey) {
    console.warn("Firebase API Key 尚未設定或無法讀取，請檢查 .env 檔案與啟動方式");
  }
  
  app = initializeApp(firebaseConfig);
  authInstance = getAuth(app);
  provider = new GoogleAuthProvider();
  
  // 設定登入狀態持久化
  setPersistence(authInstance, browserLocalPersistence).catch((err) => {
    console.warn("Firebase Auth persistence setup failed:", err);
  });
} catch (error) {
  console.error("Firebase 初始化失敗 (Init Error):", error);
}

// 匯出 User 型別
export type User = FirebaseUser;

// 匯出 auth 實例與 provider
export const auth = authInstance;
export const googleProvider = provider;

// 包裝原始 Firebase 函式以符合 App 介面
export const signInWithPopup = async (auth: any, provider: any) => {
  if (!auth) {
    alert("Firebase 初始化失敗，無法登入。\n請檢查 .env 設定檔是否正確，或是否直接開啟了 HTML 檔案 (需使用 Web Server)。");
    return;
  }

  if (window.location.protocol === 'file:') {
      alert("錯誤：Google 登入不支援 'file://' 協定。\n請上傳至伺服器或使用 'npm run dev' 在 localhost 執行。");
      return;
  }

  try {
    return await firebaseSignInWithPopup(auth, provider);
  } catch (error: any) {
    console.error("登入錯誤 Details:", error);
    if (error.code === 'auth/operation-not-supported-in-this-environment') {
        alert("登入失敗：環境不支援。\n請確認您使用的是 http:// 或 https:// 協定 (不要用 file://)，且瀏覽器未封鎖第三方 Cookie。");
    } else if (error.code === 'auth/unauthorized-domain') {
        alert(`登入失敗：網域未授權。\n目前的網域是: ${window.location.hostname}\n請前往 Firebase Console -> Authentication -> Settings -> Authorized domains 將其加入。`);
    } else if (error.code === 'auth/popup-closed-by-user') {
        console.log("使用者取消登入");
    } else if (error.code === 'auth/api-key-not-valid') {
        alert("登入失敗：API Key 無效。\n請檢查 .env 檔案中的 VITE_FIREBASE_API_KEY 是否正確。");
    } else {
        alert(`登入失敗: ${error.message}`);
    }
    throw error;
  }
};

export const signOut = async (auth: any) => {
  if (!auth) return;
  return firebaseSignOut(auth);
};

export const onAuthStateChanged = (auth: any, callback: (user: User | null) => void) => {
  if (!auth) {
    callback(null);
    return () => {};
  }
  return firebaseOnAuthStateChanged(auth, callback);
};