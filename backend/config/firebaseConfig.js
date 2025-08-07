// // require("dotenv").config();

const { database } = require("firebase-admin");
// backend/config/firebaseConfig.js
require("dotenv").config();

const firebaseConfig = {
  apiKey: process.env.Fire_Api_Key,
  authDomain: process.env.Fire_Auth_Domain,
  projectId: process.env.Fire_Project_Id,
  storageBucket: process.env.Fire_Storage_Bucket,
  messagingSenderId: process.env.Fire_Messaging_Sender_Id,
  appId: process.env.Fire_App_Id,
  measurementId: process.env.Fire_Measurement_Id,
  databaseURL: process.env.Fire_Database_Url,
};

// // Log configuration to verify values
// console.log("Firebase Config Loaded:", {
//   apiKey: firebaseConfig.apiKey ? "****" : undefined, // Hide sensitive data
//   authDomain: firebaseConfig.authDomain,
//   projectId: firebaseConfig.projectId,
//   storageBucket: firebaseConfig.storageBucket,
//   messagingSenderId: firebaseConfig.messagingSenderId,
//   appId: firebaseConfig.appId,
//   // measurementId: firebaseConfig.measurementId,
//   databaseURL: firebaseConfig.databaseURL,
// });

if (
  !firebaseConfig.apiKey ||
  !firebaseConfig.projectId ||
  !firebaseConfig.storageBucket
) {
  throw new Error(
    "Missing required Firebase configuration. Check environment variables: Fire_Api_Key, Fire_Project_Id, Fire_Storage_Bucket"
  );
}

module.exports = firebaseConfig;
