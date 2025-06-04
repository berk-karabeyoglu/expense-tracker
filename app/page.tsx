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
  updateDoc,
} from "firebase/firestore";
import { onAuthStateChanged, User } from "firebase/auth";
import { db, auth } from "@/app/firebase";
import Auth from "@/components/Auth";
import Loading from "@/components/Loading";
import { toast, ToastContainer } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";
import { Pie } from "react-chartjs-2";
import { Chart as ChartJS, ArcElement, Tooltip, Legend } from "chart.js";

ChartJS.register(ArcElement, Tooltip, Legend);

export default function Home() {
  const [items, setItems] = useState<any[]>([]);
  const [newItem, setNewItem] = useState({
    name: "",
    price: "",
    creationDate: "",
    category: "",
  });
  const [editItemId, setEditItemId] = useState<string | null>(null);
  const [editForm, setEditForm] = useState({
    name: "",
    price: "",
    category: "",
  });
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(false);
  const [user, setUser] = useState<User | null>(null);
  const [username, setUsername] = useState("");
  const [authChecked, setAuthChecked] = useState(false);
  const [pendingDeleteId, setPendingDeleteId] = useState<string | null>(null);
  const [filterMonth, setFilterMonth] = useState<number | "">("");
  const [filterYear, setFilterYear] = useState<number | "">("");
  const [filterCategory, setFilterCategory] = useState("");
  const [originalEditForm, setOriginalEditForm] = useState({
    name: "",
    price: "",
    category: "",
  });
  const [categoryTotals, setCategoryTotals] = useState<{
    [key: string]: number;
  }>({});
  const chartRef = useRef<ChartJS | null>(null);

  const itemRef = useRef<HTMLInputElement | null>(null);

  const monthNames = [
    "Ocak",
    "Şubat",
    "Mart",
    "Nisan",
    "Mayıs",
    "Haziran",
    "Temmuz",
    "Ağustos",
    "Eylül",
    "Ekim",
    "Kasım",
    "Aralık",
  ];
  const categoryColors = [
    "#4f46e5", // indigo
    "#22c55e", // green
    "#ef4444", // red
    "#f59e0b", // amber
    "#14b8a6", // teal
    "#a855f7", // purple
    "#6b7280", // gray
  ];

  const now = new Date();
  const currentMonth = now.getMonth() + 1;
  const currentYear = now.getFullYear();

  const handlePieClick = (event: any) => {
    if (!chartRef.current) return;

    const chart = chartRef.current;
    const elements = chart.getElementsAtEventForMode(
      event,
      "nearest",
      { intersect: true },
      false
    );

    if (elements.length > 0) {
      const index = elements[0].index;
      const clickedCategory = Object.keys(categoryTotals)[index];
      setFilterCategory(clickedCategory);
      toast.info(`"${clickedCategory}" kategorisi filtrelendi.`);
    }
  };

  const handleFilterThisMonth = () => {
    setFilterMonth(currentMonth);
    setFilterYear(currentYear);
  };

  const handleFilterLastMonth = () => {
    let year = currentYear;
    let month = currentMonth - 1;
    if (month === 0) {
      month = 12;
      year = year - 1;
    }
    setFilterMonth(month);
    setFilterYear(year);
  };

  const handleFilterThisYear = () => {
    setFilterMonth("");
    setFilterYear(currentYear);
  };

  const handleClearFilters = () => {
    setFilterMonth("");
    setFilterYear("");
    setFilterCategory("");
  };

  const handleMonthChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const monthValue = Number(e.target.value) || "";
    setFilterMonth(monthValue);
    if (!filterYear) {
      setFilterYear(new Date().getFullYear());
    }
  };

  const handleYearChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const yearValue = Number(e.target.value) || "";
    setFilterYear(yearValue);
  };

  const startEditing = (item: any) => {
    setEditItemId(item.id);
    setEditForm({
      name: item.name,
      price: item.price,
      category: item.category || "",
    });
    setOriginalEditForm({
      name: item.name,
      price: item.price,
      category: item.category || "",
    });
  };

  const saveEdit = async (id: string) => {
    if (!editForm.name || !editForm.price) {
      toast.warn("Ad veya fiyat boş olamaz.");
      return;
    }

    try {
      await updateDoc(doc(db, "items", id), {
        name: editForm.name.trim(),
        price: editForm.price,
        category: editForm.category || "Diğer",
      });
      toast.success("Harcama güncellendi.", { autoClose: 1500 });
      setEditItemId(null);
    } catch {
      toast.error("Güncelleme başarısız.");
    }
  };

  useEffect(() => {
    const totals: { [key: string]: number } = {};

    items.forEach((item) => {
      const category = item.category || "Diğer";
      const price = parseFloat(item.price) || 0;
      totals[category] = (totals[category] || 0) + price;
    });

    setCategoryTotals(totals);
  }, [items]);

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

  useEffect(() => {
    if (!user) {
      setItems([]);
      setTotal(0);
      return;
    }

    setLoading(true);

    const constraints = [where("userId", "==", user.uid)];

    // Tarih filtreleri
    if (filterYear) {
      if (filterMonth) {
        // Ay ve yıl seçilmiş
        const start = new Date(filterYear, filterMonth - 1, 1, 0, 0, 0, 0);
        const end = new Date(filterYear, filterMonth, 0, 23, 59, 59, 999);
        constraints.push(where("createdAt", ">=", start));
        constraints.push(where("createdAt", "<=", end));
      } else {
        // Sadece yıl seçilmiş
        const start = new Date(filterYear, 0, 1, 0, 0, 0, 0);
        const end = new Date(filterYear, 11, 31, 23, 59, 59, 999);
        constraints.push(where("createdAt", ">=", start));
        constraints.push(where("createdAt", "<=", end));
      }
    }

    // Kategori filtresi
    if (filterCategory && filterCategory !== "") {
      constraints.push(where("category", "==", filterCategory));
    }

    console.log("constraints:", constraints);

    const q = query(collection(db, "items"), ...constraints);
    console.log("Firestore query constraints:", constraints);

    const unsubscribe = onSnapshot(
      q,
      (querySnapshot) => {
        const itemsArr: any[] = [];
        querySnapshot.forEach((doc) =>
          itemsArr.push({ ...doc.data(), id: doc.id })
        );
        itemsArr.sort((a, b) => {
          const aTime = a.createdAt?.toDate?.().getTime() || 0;
          const bTime = b.createdAt?.toDate?.().getTime() || 0;
          return bTime - aTime;
        });
        setItems(itemsArr);
        const totalPrice = itemsArr.reduce(
          (sum, item) => sum + parseFloat(item.price),
          0
        );
        setTotal(totalPrice);
        setLoading(false);
      },
      (error) => {
        console.error("Firestore snapshot error:", error);
        toast.error("Veriler alınırken bir hata oluştu.");
        setLoading(false);
      }
    );

    return () => unsubscribe();
  }, [user, filterMonth, filterYear, filterCategory]);

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
        creationDate: `${new Date().toLocaleDateString("tr-TR")}`,
        userId: user.uid,
        createdAt: serverTimestamp(),
        category: newItem.category || "Diğer",
      });
      setNewItem({ name: "", price: "", creationDate: "", category: "" });
      itemRef.current?.focus();
      toast.success("Harcama eklendi!", { autoClose: 1500 });
    } catch {
      toast.error("Harcamayı eklerken hata oluştu.");
    }
  };

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
            className="bg-gray-500 px-3 py-1 rounded text-white hover:bg-opacity-80 transition"
            title="İptal"
          >
            Hayır
          </button>
        </div>
      </div>,
      { position: "top-center", autoClose: false, closeButton: false }
    );
  };

  const deleteItem = async (id: string) => {
    try {
      await deleteDoc(doc(db, "items", id));
      toast.success("Harcama silindi.", { autoClose: 1500 });
    } catch {
      toast.error("Silme işlemi başarısız.");
    }
  };

  const isEditChanged =
    editForm.name !== originalEditForm.name ||
    editForm.price !== originalEditForm.price ||
    editForm.category !== originalEditForm.category;

  if (!authChecked) return <Loading />;
  if (!user) return <Auth />;
  if (loading) return <Loading />;

  return (
    <main className="flex min-h-screen flex-col bg-slate-900 px-4 py-6">
      <ToastContainer />
      <header className="max-w-4xl mx-auto w-full flex justify-between items-center py-4 mb-4 text-white">
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

      {/* Filtreler */}
      <div className="max-w-4xl mx-auto w-full text-white mb-6">
        <div className="flex gap-3 flex-wrap mb-2">
          <select
            value={filterMonth}
            onChange={handleMonthChange}
            className="p-2 bg-slate-800 border border-gray-600 rounded appearance-none pr-8 relative text-white"
            style={{
              backgroundImage: `url("data:image/svg+xml;utf8,<svg fill='white' height='24' viewBox='0 0 24 24' width='24' xmlns='http://www.w3.org/2000/svg'><path d='M7 10l5 5 5-5z'/></svg>")`,
              backgroundRepeat: "no-repeat",
              backgroundPosition: "right 0.75rem center",
              backgroundSize: "1rem",
            }}
          >
            <option value="">Tüm Aylar</option>
            {[...Array(12)].map((_, i) => (
              <option key={i + 1} value={i + 1}>
                {monthNames[i]}
              </option>
            ))}
          </select>
          <select
            value={filterYear}
            onChange={handleYearChange}
            className="p-2 bg-slate-800 border border-gray-600 rounded appearance-none pr-8 text-white"
            style={{
              backgroundImage: `url("data:image/svg+xml;utf8,<svg fill='white' height='24' viewBox='0 0 24 24' width='24' xmlns='http://www.w3.org/2000/svg'><path d='M7 10l5 5 5-5z'/></svg>")`,
              backgroundRepeat: "no-repeat",
              backgroundPosition: "right 0.75rem center",
              backgroundSize: "1rem",
            }}
          >
            <option value="">Tüm Yıllar</option>
            {[...Array(5)].map((_, i) => {
              const year = new Date().getFullYear() - i;
              return (
                <option key={year} value={year}>
                  {year}
                </option>
              );
            })}
          </select>

          {/* Kategori filtresi */}
          <select
            value={filterCategory}
            onChange={(e) => {
              console.log("Kategori seçildi:", e.target.value);
              setFilterCategory(e.target.value);
            }}
            className="p-2 bg-slate-800 border border-gray-600 rounded appearance-none pr-8 text-white"
            style={{
              backgroundImage: `url("data:image/svg+xml;utf8,<svg fill='white' height='24' viewBox='0 0 24 24' width='24' xmlns='http://www.w3.org/2000/svg'><path d='M7 10l5 5 5-5z'/></svg>")`,
              backgroundRepeat: "no-repeat",
              backgroundPosition: "right 0.75rem center",
              backgroundSize: "1rem",
            }}
          >
            <option value="">Tüm Kategoriler</option>
            <option value="Yiyecek">Yiyecek</option>
            <option value="Ulaşım">Ulaşım</option>
            <option value="Eğlence">Eğlence</option>
            <option value="Fatura">Fatura</option>
            <option value="Diğer">Diğer</option>
          </select>
        </div>

        <div className="relative w-full sm:w-auto">
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mt-4 w-full">
            {[
              {
                label: "Bu Ay",
                onClick: handleFilterThisMonth,
                active:
                  filterMonth === currentMonth && filterYear === currentYear,
              },
              {
                label: "Geçen Ay",
                onClick: handleFilterLastMonth,
                active:
                  filterMonth === currentMonth - 1 &&
                  filterYear === currentYear,
              },
              {
                label: "Bu Yıl",
                onClick: handleFilterThisYear,
                active: filterMonth === "" && filterYear === currentYear,
              },
              {
                label: "Tümünü Göster",
                onClick: handleClearFilters,
                active:
                  filterMonth === "" && filterYear === "" && !filterCategory,
              },
            ].map(({ label, onClick, active }) => (
              <button
                key={label}
                onClick={onClick}
                className={`w-full p-3 rounded-lg text-sm font-medium transition text-center ${
                  active
                    ? "bg-indigo-600 text-white"
                    : "bg-slate-700 text-white hover:bg-slate-600"
                }`}
              >
                {label}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Form */}
      <section className="max-w-4xl mx-auto w-full bg-slate-800 p-4 sm:p-6 rounded-lg shadow-lg text-white">
        <form
          onSubmit={addItem}
          className="flex flex-col sm:grid sm:grid-cols-6 gap-3"
        >
          <input
            ref={itemRef}
            value={newItem.name}
            onChange={(e) => setNewItem({ ...newItem, name: e.target.value })}
            className="sm:col-span-2 p-4 text-gray-700 rounded-lg border border-gray-700"
            type="text"
            placeholder="Ürün Adı"
          />
          <input
            value={newItem.price}
            onChange={(e) => setNewItem({ ...newItem, price: e.target.value })}
            className="sm:col-span-1 p-4 text-gray-700 rounded-lg border border-gray-700"
            type="number"
            placeholder="₺"
          />
          <select
            value={newItem.category}
            onChange={(e) =>
              setNewItem({ ...newItem, category: e.target.value })
            }
            className="sm:col-span-2 p-4 pr-10 text-gray-700 rounded-lg border border-gray-300 appearance-none bg-white"
            style={{
              backgroundImage:
                "url(\"data:image/svg+xml;utf8,<svg fill='black' height='24' viewBox='0 0 24 24' width='24' xmlns='http://www.w3.org/2000/svg'><path d='M7 10l5 5 5-5z'/></svg>\")",
              backgroundRepeat: "no-repeat",
              backgroundPosition: "right 0.75rem center",
              backgroundSize: "1rem",
            }}
          >
            <option value="" disabled>
              Kategori Seç
            </option>
            <option value="Yiyecek">Yiyecek</option>
            <option value="Ulaşım">Ulaşım</option>
            <option value="Eğlence">Eğlence</option>
            <option value="Fatura">Fatura</option>
            <option value="Diğer">Diğer</option>
          </select>

          <button
            type="submit"
            className="sm:col-span-1 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg p-4 text-3xl font-bold"
          >
            +
          </button>
        </form>

        {/* Liste */}
        <ul className="mt-6 space-y-3">
          {items.map((item) =>
            item.id === editItemId ? (
              <li
                key={item.id}
                className="flex flex-col sm:flex-row justify-between items-start sm:items-center bg-slate-950 hover:bg-indigo-900 p-4 rounded-lg gap-4"
              >
                <div className="flex flex-col sm:flex-row gap-2 w-full">
                  <input
                    value={editForm.name}
                    onChange={(e) =>
                      setEditForm({ ...editForm, name: e.target.value })
                    }
                    className="p-2 rounded bg-slate-800 text-white border border-gray-600"
                    placeholder="Ad"
                  />
                  <input
                    type="number"
                    value={editForm.price}
                    onChange={(e) =>
                      setEditForm({ ...editForm, price: e.target.value })
                    }
                    className="p-2 rounded bg-slate-800 text-white border border-gray-600"
                    placeholder="₺"
                  />
                  <select
                    value={editForm.category}
                    onChange={(e) =>
                      setEditForm({ ...editForm, category: e.target.value })
                    }
                    className="p-2 pr-8 rounded bg-slate-800 text-white border border-gray-600 appearance-none"
                    style={{
                      backgroundImage:
                        "url(\"data:image/svg+xml;utf8,<svg fill='white' height='24' viewBox='0 0 24 24' width='24' xmlns='http://www.w3.org/2000/svg'><path d='M7 10l5 5 5-5z'/></svg>\")",
                      backgroundRepeat: "no-repeat",
                      backgroundPosition: "right 0.75rem center",
                      backgroundSize: "1rem",
                    }}
                  >
                    <option value="" disabled>
                      Kategori Seç
                    </option>
                    <option value="Yiyecek">Yiyecek</option>
                    <option value="Ulaşım">Ulaşım</option>
                    <option value="Eğlence">Eğlence</option>
                    <option value="Fatura">Fatura</option>
                    <option value="Diğer">Diğer</option>
                  </select>
                </div>
                <div className="flex gap-2 mt-2 sm:mt-0 justify-end w-full sm:w-auto">
                  <button
                    onClick={() => setEditItemId(null)}
                    className="bg-gray-600 text-white px-3 py-1 rounded hover:bg-gray-700"
                  >
                    Vazgeç
                  </button>
                  <button
                    onClick={() => saveEdit(item.id)}
                    disabled={!isEditChanged}
                    className={`px-3 py-1 rounded text-white transition ${
                      isEditChanged
                        ? "bg-green-600 hover:bg-green-700"
                        : "bg-gray-600 cursor-not-allowed opacity-40"
                    }`}
                  >
                    Kaydet
                  </button>
                </div>
              </li>
            ) : (
              <li
                key={item.id}
                className="flex justify-between items-center bg-slate-950 md:hover:bg-indigo-900 p-4 rounded-lg"
              >
                <div>
                  <div className="font-medium">{item.name}</div>
                  <div className="text-xs text-gray-400">
                    {item.creationDate} | {item.category || "Kategori Yok"}
                  </div>
                </div>
                <div className="flex items-center gap-4">
                  <span className="font-semibold">{item.price} ₺</span>
                  <button
                    onClick={() => startEditing(item)}
                    className="text-indigo-400 hover:text-indigo-600"
                  >
                    ✎
                  </button>
                  <button
                    onClick={() => confirmDelete(item.id)}
                    className="text-red-400 hover:text-red-600"
                  >
                    ✕
                  </button>
                </div>
              </li>
            )
          )}
        </ul>

        {items.length === 0 && (
          <div className="mt-4 text-center text-indigo-400 font-semibold">
            {filterMonth && filterYear && filterCategory
              ? `${
                  monthNames[filterMonth - 1]
                } ${filterYear} ayına ait "${filterCategory}" kategorisinde harcamanız bulunmamaktadır.`
              : filterMonth && filterYear
              ? `${
                  monthNames[filterMonth - 1]
                } ${filterYear} ayına ait harcamanız bulunmamaktadır.`
              : filterYear && filterCategory
              ? `${filterYear} yılına ait "${filterCategory}" kategorisinde harcamanız bulunmamaktadır.`
              : filterYear
              ? `${filterYear} yılına ait harcamanız bulunmamaktadır.`
              : "Harcamaya ait veri bulunamadı."}
          </div>
        )}

        {items.length > 0 && (
          <div className="mt-6 flex justify-between items-center text-indigo-300 font-semibold text-xl border-t border-indigo-600 pt-4">
            <span>Toplam</span>
            <span>{total.toFixed(2)} ₺</span>
          </div>
        )}

        <div className="flex items-center my-16 text-yellow-500">
          <div className="flex-grow border-t border-yellow-300"></div>
          <span className="mx-4 text-3xl animate-bounce">💸</span>
          <div className="flex-grow border-t border-yellow-300"></div>
        </div>

        {Object.keys(categoryTotals).length > 0 && (
          <div className="mt-4 bg-slate-800 p-4 rounded-lg">
            <div className="mt-2 mb-6 flex flex-wrap justify-center gap-3 text-xs">
              {Object.entries(categoryTotals).map(([category], index) => (
                <div
                  key={category}
                  className="flex items-center gap-1 whitespace-nowrap"
                  style={{ minWidth: "80px" }} // Kutucuk biraz daha küçük
                >
                  <span
                    className="inline-block w-4 h-4 rounded-full"
                    style={{
                      backgroundColor:
                        categoryColors[index % categoryColors.length],
                    }}
                  ></span>
                  <span>{category}</span>
                </div>
              ))}
            </div>

            <Pie
              data={{
                labels: Object.keys(categoryTotals),
                datasets: [
                  {
                    data: Object.values(categoryTotals),
                    backgroundColor: categoryColors,
                    borderColor: "#1f2937",
                    borderWidth: 1,
                  },
                ],
              }}
              options={{
                onClick: handlePieClick,
                plugins: {
                  legend: { display: false }, // sadece yazılı listeyi gösteriyoruz
                },
              }}
            />
            <ul className="mt-4 text-white text-sm rounded overflow-hidden">
              {Object.entries(categoryTotals).map(
                ([category, amount], index) => (
                  <li
                    key={category}
                    className={`flex items-center justify-between px-4 py-2 ${
                      index < Object.entries(categoryTotals).length - 1
                        ? "border-b border-gray-600"
                        : ""
                    }`}
                    style={{ borderLeft: "none", borderRight: "none" }}
                  >
                    <div className="flex items-center gap-2">
                      <span
                        className="inline-block w-3 h-3 rounded-full"
                        style={{
                          backgroundColor:
                            categoryColors[index % categoryColors.length],
                        }}
                      ></span>
                      <span>{category}</span>
                    </div>
                    <span className="font-medium">{amount.toFixed(2)} ₺</span>
                  </li>
                )
              )}
            </ul>
          </div>
        )}
      </section>
    </main>
  );
}
