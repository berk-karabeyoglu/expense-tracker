"use client";

import {
  addDoc,
  collection,
  deleteDoc,
  doc,
  onSnapshot,
  query,
} from "firebase/firestore";

import { db } from "@/app/firebase";
import React, { useEffect, useRef, useState } from "react";

export default function Home() {
  const [items, setItems] = useState([]);
  const [newItem, setNewItem] = useState({ name: "", price: "" });
  const [total, setTotal] = useState(0);
  const itemRef: any = useRef();

  // Add item to db

  const addItem = async (e: any) => {
    e.preventDefault();

    if (newItem.name !== "" && newItem.price !== "") {
      await addDoc(collection(db, "items"), {
        name: newItem.name.trim(),
        price: newItem.price,
      });
      setNewItem({ name: "", price: "" });
      itemRef.current.focus();
    } else {
      alert("Item or price can not be empty!");
    }
  };

  // Read items from db

  useEffect(() => {
    const q = query(collection(db, "items"));
    const unsubscribe = onSnapshot(q, (querySnapshot) => {
      let itemsArr: any = [];

      querySnapshot.forEach((doc) => {
        itemsArr.push({ ...doc.data(), id: doc.id });
      });
      setItems(itemsArr);

      // Read total from itemsArr

      const calculateTotal = () => {
        const totalPrice = itemsArr.reduce(
          (sum: any, item: any) => sum + parseFloat(item.price),
          0
        );
        setTotal(totalPrice);
      };
      calculateTotal();
      return () => unsubscribe();
    });
  }, []);

  // Delete item from db

  const deleteItem = async (id: any) => {
    await deleteDoc(doc(db, "items", id));
  };

  return (
    <main className="flex min-h-screen flex-col items-center justify-between sm:p-24 p-4 bg-slate-900">
      <div className="z-10 w-full max-w-5xl items-center justify-between font-mono text-sm ">
        <h1 className="text-4xl p-4 text-center text-white">
          Betül's Expense Tracker
        </h1>

        <div className="bg-slate-800 p-4 rounded-lg mt-16">
          <form className="grid grid-cols-6 items-center text-black">
            <input
              ref={(input) => {
                itemRef.current = input;
              }}
              value={newItem.name}
              onChange={(e: any) =>
                setNewItem({ ...newItem, name: e.target.value })
              }
              className="col-span-3 p-3 border"
              type="text"
              placeholder="Enter Item"
            />
            <input
              value={newItem.price}
              onChange={(e: any) =>
                setNewItem({ ...newItem, price: e.target.value })
              }
              className="col-span-2 p-3 border mx-3"
              type="number"
              placeholder="Enter ₺"
            />
            <button
              onClick={addItem}
              className="text-white bg-slate-950 hover:bg-slate-900 p-3 text-xl cursor-pointer"
              type="submit"
            >
              +
            </button>
          </form>

          <ul>
            {items.map((item: any, id: any) => (
              <li
                key={id}
                className="my-4 w-full flex justify-between bg-slate-950 text-white"
              >
                <div className="p-4 w-full flex justify-between">
                  <span className="capitalize">{item.name}</span>
                  <span>{item.price} ₺</span>
                </div>
                <button
                  onClick={() => deleteItem(item.id)}
                  className="ml-8 p-4 border-l-2 border-slate-900 hover:bg-slate-900 w-16 cursor-pointer"
                >
                  X
                </button>
              </li>
            ))}
          </ul>
          {items.length < 1 ? (
            ""
          ) : (
            <div className="flex justify-between p-3 text-white">
              <span>Total</span>
              <span>{total} ₺</span>
            </div>
          )}
        </div>
      </div>
    </main>
  );
}
