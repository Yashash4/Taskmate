import { db } from "./firebase-config.js";
import {
  doc, getDoc, setDoc, updateDoc, addDoc, getDocs, collection,
  query, where, orderBy, serverTimestamp
} from "https://www.gstatic.com/firebasejs/10.13.2/firebase-firestore.js";

export {
  db, doc, getDoc, setDoc, updateDoc, addDoc, getDocs, collection,
  query, where, orderBy, serverTimestamp
};
