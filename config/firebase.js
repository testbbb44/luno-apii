const admin = require("firebase-admin")

let db

const initializeFirebase = () => {
  try {
       // Check if Firebase is already initialized
       if (admin.apps.length > 0) {
        console.log("✅ Firebase already initialized")
        db = admin.firestore()
        return
      }
    // Initialize Firebase Admin SDK
    const serviceAccount = {
      type: "service_account",
      project_id: process.env.FIREBASE_PROJECT_ID,
      private_key_id: process.env.FIREBASE_PRIVATE_KEY_ID,
      private_key: process.env.FIREBASE_PRIVATE_KEY.replace(/\\n/g, "\n"),
      client_email: process.env.FIREBASE_CLIENT_EMAIL,
      client_id: process.env.FIREBASE_CLIENT_ID,
      auth_uri: "https://accounts.google.com/o/oauth2/auth",
      token_uri: "https://oauth2.googleapis.com/token",
      auth_provider_x509_cert_url: "https://www.googleapis.com/oauth2/v1/certs",
      client_x509_cert_url: `https://www.googleapis.com/robot/v1/metadata/x509/${process.env.FIREBASE_CLIENT_EMAIL}`,
    }

    admin.initializeApp({
        credential: admin.credential.cert(serviceAccount),
        databaseURL: `https://${process.env.FIREBASE_PROJECT_ID}-default-rtdb.firebaseio.com`,
        storageBucket: `${process.env.FIREBASE_PROJECT_ID}.appspot.com`, // Add storage bucket
      })

    db = admin.firestore()
    console.log("✅ Firebase initialized successfully")
    console.log(`📦 Storage bucket: ${process.env.FIREBASE_PROJECT_ID}.appspot.com`)

  } catch (error) {
    console.error("❌ Firebase initialization failed:", error)
    process.exit(1)
  }
}

const getFirestore = () => {
  if (!db) {
    throw new Error("Firestore not initialized. Call initializeFirebase() first.")
  }
  return db
}

module.exports = {
  initializeFirebase,
  getFirestore,
  admin,
}
