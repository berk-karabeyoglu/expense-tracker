"use client";

import React, { useState } from "react";
import { auth, db } from "@/app/firebase";
import {
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
} from "firebase/auth";
import { doc, setDoc } from "firebase/firestore";

import { toast, ToastContainer } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";

export default function Auth() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");
  const [isRegister, setIsRegister] = useState(false);
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      if (isRegister) {
        const userCredential = await createUserWithEmailAndPassword(
          auth,
          email,
          password
        );

        // Kullanıcı adı Firestore users koleksiyonuna ekle
        if (userCredential.user) {
          await setDoc(doc(db, "users", userCredential.user.uid), {
            name: name.trim(),
            email: email,
          });
        }
        toast.success("Kayıt başarılı!");
      } else {
        await signInWithEmailAndPassword(auth, email, password);
        toast.success("Giriş başarılı!");
      }
    } catch (error: any) {
      // Daha kullanıcı dostu mesajlar için hata kodlarını kontrol edelim
      if (error.code === "auth/user-not-found") {
        toast.error("Kullanıcı bulunamadı.");
      } else if (error.code === "auth/wrong-password") {
        toast.error("Şifre yanlış.");
      } else if (error.code === "auth/invalid-credential") {
        toast.error("Geçersiz kimlik bilgileri.");
      } else if (error.code === "auth/email-already-in-use") {
        toast.error("Bu email zaten kullanımda.");
      } else if (error.code === "auth/invalid-email") {
        toast.error("Geçersiz email adresi.");
      } else if (error.code === "auth/weak-password") {
        toast.error("Şifre çok zayıf. En az 6 karakter olmalı.");
      } else {
        toast.error("Bir hata oluştu: " + error.message);
      }
    }
    setLoading(false);
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-r from-purple-700 to-indigo-600 p-4">
      <ToastContainer position="top-right" autoClose={3000} />
      <div className="bg-white rounded-lg shadow-lg p-8 w-full max-w-md">
        <h2 className="text-2xl font-semibold text-center mb-6">
          {isRegister ? "Kayıt Ol" : "Giriş Yap"}
        </h2>
        <form onSubmit={handleSubmit} className="space-y-5">
          {isRegister && (
            <input
              type="text"
              placeholder="İsminiz"
              required={isRegister}
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full p-3 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-indigo-500"
              disabled={loading}
            />
          )}
          <input
            type="email"
            placeholder="Email"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="w-full p-3 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-indigo-500"
            disabled={loading}
          />
          <div className="relative">
            <input
              type={showPassword ? "text" : "password"}
              placeholder="Şifre"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full p-3 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-indigo-500 pr-10"
              disabled={loading}
            />
            <button
              type="button"
              onClick={() => setShowPassword(!showPassword)}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-700 focus:outline-none"
              tabIndex={-1}
              aria-label={showPassword ? "Şifreyi gizle" : "Şifreyi göster"}
            >
              {showPassword ? (
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  className="h-5 w-5"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                  strokeWidth={2}
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M13.875 18.825A10.05 10.05 0 0112 19c-5.523 0-10-4.477-10-10 0-1.347.332-2.62.918-3.757M15 12a3 3 0 11-6 0 3 3 0 016 0z"
                    opacity={0.3}
                  />
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M3 3l18 18"
                  />
                </svg>
              ) : (
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  className="h-5 w-5"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                  strokeWidth={2}
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"
                  />
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M2.458 12C3.732 7.943 7.523 5 12 5c4.477 0 8.268 2.943 9.542 7-1.274 4.057-5.065 7-9.542 7-4.477 0-8.268-2.943-9.542-7z"
                  />
                </svg>
              )}
            </button>
          </div>
          <button
            type="submit"
            disabled={loading}
            className="w-full bg-indigo-600 text-white p-3 rounded hover:bg-indigo-700 transition disabled:opacity-50"
          >
            {loading
              ? "Lütfen Bekleyin..."
              : isRegister
              ? "Kayıt Ol"
              : "Giriş Yap"}
          </button>
        </form>
        <div className="mt-4 text-center">
          <button
            onClick={() => setIsRegister(!isRegister)}
            className="text-indigo-600 hover:underline focus:outline-none"
            disabled={loading}
          >
            {isRegister
              ? "Zaten hesabınız var mı? Giriş yap"
              : "Hesabınız yok mu? Kayıt ol"}
          </button>
        </div>
      </div>
    </div>
  );
}
