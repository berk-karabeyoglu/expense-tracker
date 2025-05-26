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

  // Tarihi formatla
  const today = new Date();
  const yyyy = today.getFullYear();
  let mm: number | string = today.getMonth() + 1;
  let dd: number | string = today.getDate();

  if (dd < 10) dd = "0" + dd;
  if (mm < 10) mm = "0" + mm;

  const formattedToday = dd + "/" + mm + "/" + yyyy;

  // Kullanıcı durumunu takip et, username de çek
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (currentUser) => {
      setUser(currentUser);

      if (currentUser) {
        try {
          const userDoc = await getDoc(doc(db, "users", currentUser.uid));
          if (userDoc.exists()) {
            setUsername(userDoc.data().name || "");
          } else {
            setUsername("");
          }
        } catch {
          setUsername("");
        }
      } else {
        setUsername("");
      }

      setAuthChecked(true);
    });

    return () => unsubscribe();
  }, []);

  // Firestore'dan kullanıcıya özel verileri oku
  useEffect(() => {
    if (!user) {
      setItems([]);
      setTotal(0);
      return;
    }

    setLoading(true);

    const q = query(collection(db, "items"), where("userId", "==", user.uid));

    const unsubscribe = onSnapshot(q, (querySnapshot) => {
      let itemsArr: any[] = [];

      querySnapshot.forEach((doc) => {
        itemsArr.push({ ...doc.data(), id: doc.id });
      });

      // createdAt'a göre sırala (en yeni üstte)
      itemsArr.sort((a, b) => {
        if (!a.createdAt || !b.createdAt) return 0;
        const aTime = a.createdAt.toDate ? a.createdAt.toDate().getTime() : 0;
        const bTime = b.createdAt.toDate ? b.createdAt.toDate().getTime() : 0;
        return bTime - aTime;
      });

      setItems(itemsArr);

      // Toplamı hesapla
      const totalPrice = itemsArr.reduce(
        (sum, item) => sum + parseFloat(item.price),
        0
      );
      setTotal(totalPrice);

      setLoading(false);
    });

    return () => unsubscribe();
  }, [user]);

  // Yeni item ekle
  const addItem = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!user) {
      toast.error("Lütfen önce giriş yapın.");
      return;
    }

    if (newItem.price.includes(",")) {
      toast.warn("Fiyat kısmında virgül kullanmayın. Lütfen nokta kullanın.");
      return;
    }

    if (newItem.name === "" || newItem.price === "") {
      toast.warn("Ürün adı ve fiyat boş olamaz!");
      return;
    }

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
      toast.success("Harcamaya eklendi!");
    } catch (error) {
      toast.error("Harcamayı eklerken hata oluştu.");
    }
  };

  // Silme işlemi için toast onayı göster
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
            className="bg-red-600 px-3 py-1 rounded text-white"
          >
            Evet
          </button>
          <button
            onClick={() => {
              setPendingDeleteId(null);
              toast.dismiss();
            }}
            className="bg-gray-500 px-3 py-1 rounded text-white"
          >
            Hayır
          </button>
        </div>
      </div>,
      {
        position: "top-center",
        autoClose: false,
        closeOnClick: false,
        closeButton: false,
        draggable: false,
        pauseOnHover: true,
      }
    );
  };

  // Item sil
  const deleteItem = async (id: string) => {
    try {
      await deleteDoc(doc(db, "items", id));
      toast.success("Harcamayı sildin.");
      setPendingDeleteId(null);
      toast.dismiss();
    } catch (error) {
      toast.error("Silme işlemi başarısız.");
    }
  };

  if (!authChecked) {
    return <Loading />;
  }

  if (loading) return <Loading />;

  if (user)
    return (
      <main className="flex min-h-screen flex-col bg-slate-900 md:px-0 px-4">
        <ToastContainer />
        <header className="flex justify-between items-center max-w-5xl mx-auto w-full py-4">
          <h1 className="text-4xl text-white font-bold">Expense Tracker</h1>
          <div className="flex items-center gap-4 text-white">
            <span className="hidden sm:inline-block">
              Hoşgeldin, <strong>{username || user.email}</strong>
            </span>
            <button
              onClick={() => auth.signOut()}
              className="bg-red-600 hover:bg-red-700 transition text-white px-4 py-2 rounded"
            >
              Çıkış Yap
            </button>
          </div>
        </header>

        <div className="z-10 w-full max-w-5xl mx-auto flex-grow flex flex-col justify-start font-mono text-sm">
          <div className="bg-slate-800 p-4 rounded-lg mt-4">
            <form
              className="grid grid-cols-6 gap-2 items-center text-black"
              onSubmit={addItem}
            >
              <input
                ref={(input) => {
                  itemRef.current = input;
                }}
                value={newItem.name}
                onChange={(e) =>
                  setNewItem({ ...newItem, name: e.target.value })
                }
                className="col-span-6 sm:col-span-3 p-3 border rounded"
                type="text"
                placeholder="Item Name"
              />
              <input
                value={newItem.price}
                onChange={(e) =>
                  setNewItem({ ...newItem, price: e.target.value })
                }
                className="col-span-6 sm:col-span-2 p-3 border rounded"
                type="number"
                placeholder="₺"
              />
              <button
                className="col-span-6 sm:col-span-1 text-white bg-slate-950 hover:bg-slate-900 p-3 text-xl rounded cursor-pointer transition"
                type="submit"
              >
                +
              </button>
            </form>

            <ul>
              {items.map((item) => (
                <li
                  key={item.id}
                  className="my-4 w-full flex flex-col sm:flex-row items-start sm:items-center bg-slate-950 text-white rounded"
                >
                  <div className="p-4 flex-grow flex justify-between w-full sm:w-auto">
                    <span className="capitalize break-words">
                      {item.name}{" "}
                      <span className="text-[0.68rem] block sm:inline">
                        ({item.creationDate})
                      </span>
                    </span>
                    <span>{item.price} ₺</span>
                  </div>
                  <button
                    onClick={() => confirmDelete(item.id)}
                    aria-label={`Delete ${item.name}`}
                    className="ml-0 sm:ml-4 mr-0 sm:mr-4 p-2 text-red-500 hover:text-red-700 rounded transition-colors duration-200 self-start sm:self-auto"
                    title="Sil"
                  >
                    <svg
                      xmlns="http://www.w3.org/2000/svg"
                      className="h-6 w-6"
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
                </li>
              ))}
            </ul>
            {items.length > 0 && (
              <div className="flex justify-between p-3 text-white font-semibold">
                <span>Total</span>
                <span>{total.toFixed(2)} ₺</span>
              </div>
            )}
          </div>
        </div>
      </main>
    );

  return <Auth />;
}
