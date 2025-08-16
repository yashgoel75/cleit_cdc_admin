"use client";

import Header from "./Header/page";
import Footer from "./Footer/page";
import "./page.css";
import { useState, useEffect } from "react";
import { onAuthStateChanged, User } from "firebase/auth";
import { auth } from "@/lib/firebase";

export default function AdminHome() {
  const [isMobile, setIsMobile] = useState(true);

  useEffect(() => {
    if (window.innerWidth > 768) {
      setIsMobile(false);
    }
  }, []);

  const [user, setUser] = useState<User | null>(null);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      setUser(user);
    });
    return () => unsubscribe();
  }, []);

  return (
    <>
      <Header />
      <main className="min-h-[85vh] flex justify-center items-center px-4 bg-gradient-to-br from-white via-gray-50 to-white onest-normal">
        <div className="max-w-4xl text-center">
          <h1 className="text-4xl md:text-5xl lg:text-6xl font-extrabold leading-tight text-gray-900">
            Manage student placements and recruitment —
            <br />
            <span className="bg-indigo-100 px-2 rounded-md text-gray-900">
              oversee placement drives, monitor tests,
            </span>
            &nbsp; and&nbsp;
            <span className="text-indigo-600 underline underline-offset-4 decoration-2">
              track student progress efficiently.
            </span>
          </h1>

          <p className="mt-6 text-gray-500 text-lg md:text-xl">
            {isMobile
              ? "Cleit CDC Admin Portal helps you manage placement activities with ease."
              : "Cleit CDC Admin Portal is your central hub to schedule and oversee placement drives, monitor online tests, manage student registrations, and generate insights for career development."}
          </p>

          <div className="mt-8">
            <a
              href={user ? "/admin/dashboard" : "/auth/login"}
              className="inline-block bg-indigo-600 hover:bg-indigo-700 text-white font-semibold py-3 px-6 rounded-lg shadow-lg transition transform hover:scale-105"
            >
              {user ? "Go to Dashboard" : "Admin Login"}
            </a>
          </div>
        </div>
      </main>
      <Footer />
    </>
  );
}
