"use client";

import React, { useEffect, useRef, useState } from "react";
import {
  addDoc,
  collection,
  deleteDoc,
  doc,
  getDoc,
  onSnapshot,
  query,
  serverTimestamp,
  where,
} from "firebase/firestore";
import { onAuthStateChanged, User } from "firebase/auth";
import { db, auth } from "@/app/firebase";
import Auth from "@/components/Auth";
import Loading from "@/components/Loading";
import { toast, ToastContainer } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";

export default function Home() {
  const [items, setItems] = useState<any[]>([]);
  const [newItem, setNewItem] = useState({
    name: "",
    price: "",
    creationDate: "",
  });
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(false);
  const [user, setUser] = useState<User | null>(null);
  const [pendingDeleteId, setPendingDeleteId] = useState<string | null>(null);
  const [username, setUsername] = useState("");
  const [authChecked, setAuthChecked] = useState(false);

  const itemRef = useRef<HTMLInputElement | null>(null);

  // Bugünün tarihi
  const today = new Date();
  const yyyy = today.getFullYear();
  let mm: string | number = today.getMonth() + 1;
  let dd: string | number = today.getDate();
  if (dd < 10) dd = "0" + dd;
  if (mm < 10) mm = "0" + mm;
  const formattedToday = `${dd}/${mm}/${yyyy}`;

  // Kullanıcıyı dinle
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (currentUser) => {
      setUser(currentUser);
      if (currentUser) {
        const userDoc = await getDoc(doc(db, "users", currentUser.uid));
        if (userDoc.exists()) setUsername(userDoc.data().name || "");
        else setUsername("");
      } else {
        setUsername("");
      }
      setAuthChecked(true);
    });
    return () => unsubscribe();
  }, []);

  // Verileri getir
  useEffect(() => {
    if (!user) {
      setItems([]);
      setTotal(0);
      return;
    }

    setLoading(true);
    const q = query(collection(db, "items"), where("userId", "==", user.uid));
    const unsubscribe = onSnapshot(q, (querySnapshot) => {
      const itemsArr: any[] = [];
      querySnapshot.forEach((doc) =>
        itemsArr.push({ ...doc.data(), id: doc.id })
      );
      itemsArr.sort((a, b) => {
        if (!a.createdAt || !b.createdAt) return 0;
        const aTime = a.createdAt.toDate ? a.createdAt.toDate().getTime() : 0;
        const bTime = b.createdAt.toDate ? b.createdAt.toDate().getTime() : 0;
        return bTime - aTime;
      });
      setItems(itemsArr);
      const totalPrice = itemsArr.reduce(
        (sum, item) => sum + parseFloat(item.price),
        0
      );
      setTotal(totalPrice);
      setLoading(false);
    });

    return () => unsubscribe();
  }, [user]);

  // Ekle
  const addItem = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return toast.error("Lütfen önce giriş yapın.");
    if (newItem.price.includes(","))
      return toast.warn("Virgül değil nokta kullanın.");
    if (newItem.name === "" || newItem.price === "")
      return toast.warn("Ürün adı veya fiyat boş olamaz!");

    try {
      await addDoc(collection(db, "items"), {
        name: newItem.name.trim(),
        price: newItem.price,
        creationDate: formattedToday,
        userId: user.uid,
        createdAt: serverTimestamp(),
      });
      setNewItem({ name: "", price: "", creationDate: "" });
      itemRef.current?.focus();
      toast.success("Harcama eklendi!", {
        position: "top-right",
        autoClose: 1500,
      });
    } catch {
      toast.error("Harcamayı eklerken hata oluştu.");
    }
  };

  // Silme onayı
  const confirmDelete = (id: string) => {
    setPendingDeleteId(id);
    toast.info(
      <div>
        <p>Bu harcamayı silmek istediğine emin misin?</p>
        <div className="mt-2 flex justify-end gap-2">
          <button
            onClick={() => {
              deleteItem(id);
              toast.dismiss();
            }}
            className="bg-red-600 px-3 py-1 rounded text-white hover:bg-opacity-80 transition"
            title="Sil"
          >
            Evet
          </button>
          <button
            onClick={() => {
              setPendingDeleteId(null);
              toast.dismiss();
            }}
            className="bg-gray-500 px-3 py-1 rounded text-white :hover:bg-opacity-80 transition"
            title="İptal"
          >
            Hayır
          </button>
        </div>
      </div>,
      { position: "top-center", autoClose: false, closeButton: false }
    );
  };

  // Sil
  const deleteItem = async (id: string) => {
    try {
      await deleteDoc(doc(db, "items", id));
      toast.success("Harcama silindi.", {
        position: "top-right",
        autoClose: 1500,
      });
      setPendingDeleteId(null);
    } catch {
      toast.error("Silme işlemi başarısız.");
    }
  };

  if (!authChecked) return <Loading />;
  if (loading) return <Loading />;

  if (user)
    return (
      <main className="flex min-h-screen flex-col bg-slate-900 px-2 sm:px-6 py-6">
        <ToastContainer />
        <header className="max-w-4xl mx-auto w-full flex justify-between items-center py-4 mb-4 sm:px-0 px-4 text-white">
          <h1 className="text-3xl font-bold">Harcamalarım</h1>
          <div className="flex items-center gap-4">
            <span className="hidden sm:inline">
              Hoşgeldin, <strong>{username || user.email}</strong>
            </span>
            <button
              onClick={() => auth.signOut()}
              className="bg-red-600 hover:bg-red-700 px-4 py-2 rounded"
            >
              Çıkış
            </button>
          </div>
        </header>

        <section className="w-full max-w-4xl mx-auto bg-slate-800 p-4 sm:p-6 rounded-lg shadow-lg text-white">
          <form
            onSubmit={addItem}
            className="flex flex-col sm:grid sm:grid-cols-6 gap-3"
          >
            <input
              ref={itemRef}
              value={newItem.name}
              onChange={(e) => setNewItem({ ...newItem, name: e.target.value })}
              className="w-full sm:col-span-3 p-4 text-gray-700 rounded-lg border border-gray-700 focus:outline-none focus:ring-2 focus:ring-indigo-500 text-lg"
              type="text"
              placeholder="Ürün Adı"
            />
            <input
              value={newItem.price}
              onChange={(e) =>
                setNewItem({ ...newItem, price: e.target.value })
              }
              className="w-full sm:col-span-2 p-4 rounded-lg border text-gray-700 border-gray-700 focus:outline-none focus:ring-2 focus:ring-indigo-500 text-lg"
              type="number"
              placeholder="₺"
            />
            <button
              type="submit"
              className="w-full sm:col-span-1 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg p-4 text-3xl font-bold transition"
            >
              +
            </button>
          </form>

          <ul className="mt-6 space-y-3">
            {items.map((item) => (
              <li
                key={item.id}
                className="flex items-center justify-between bg-slate-950 md:hover:bg-indigo-900 p-4 rounded-lg transition-colors"
              >
                {/* Sol taraf: Ürün adı + tarih */}
                <div className="flex flex-col flex-1 min-w-0">
                  <span className="text-white font-medium capitalize truncate">
                    {item.name}
                  </span>
                  <span className="text-xs text-gray-400 mt-1">
                    {item.creationDate}
                  </span>
                </div>

                {/* Sağ taraf: Fiyat + Sil butonu */}
                <div className="flex flex-col items-end justify-between ml-4 gap-2 sm:flex-row sm:items-center sm:gap-4">
                  <span className="text-indigo-200 font-semibold whitespace-nowrap">
                    {item.price} ₺
                  </span>
                  <button
                    onClick={() => confirmDelete(item.id)}
                    className="text-red-400 hover:text-red-600 p-1"
                    title="Sil"
                  >
                    <svg
                      xmlns="http://www.w3.org/2000/svg"
                      className="h-5 w-5 sm:h-6 sm:w-6"
                      fill="none"
                      viewBox="0 0 24 24"
                      stroke="currentColor"
                      strokeWidth={2}
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        d="M6 18L18 6M6 6l12 12"
                      />
                    </svg>
                  </button>
                </div>
              </li>
            ))}
          </ul>

          {items.length > 0 && (
            <div className="mt-6 flex justify-between items-center text-indigo-300 font-semibold text-xl border-t border-indigo-600 pt-4">
              <span>Toplam</span>
              <span>{total.toFixed(2)} ₺</span>
            </div>
          )}
        </section>
      </main>
    );

  return <Auth />;
}
