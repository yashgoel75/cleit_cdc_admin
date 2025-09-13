"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { onAuthStateChanged, User as FirebaseUser } from "firebase/auth";
import { auth } from "@/lib/firebase";
import Header from "../Header/page";
import Footer from "../Footer/page";
import "./page.css";
import Image from "next/image";
import linkedin from "@/assets/LinkedIn.png";
import Github from "@/assets/Github.png";
import Leetcode from "@/assets/Leetcode.png";
import { getFirebaseToken } from "@/utils";

interface UserProfile {
  name: string;
  email: string;
  phone: number;
}

export default function Account() {
  const [falseEndYear, setFalseEndYear] = useState(false);
  const [isMobile, setIsMobile] = useState(false);
  useEffect(() => {
    const handleResize = () => {
      setIsMobile(window.innerWidth <= 768);
    };

    handleResize();
    window.addEventListener("resize", handleResize);

    return () => window.removeEventListener("resize", handleResize);
  }, []);

  const [currentUser, setCurrentUser] = useState<FirebaseUser | null>(null);
  const [userData, setUserData] = useState<UserProfile | null>(null);
  const [formData, setFormData] = useState<UserProfile | null>(null);
  const [isEdit, setIsEdit] = useState(false);
  const [isPreview, setIsPreview] = useState(true);
  const [loading, setLoading] = useState(true);
  const [isUpdating, setIsUpdating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [resumeUrl, setResumeUrl] = useState<string | null>(null);
  const [isUploadingResume, setIsUploadingResume] = useState(false);
  const [usernameExists, setUsernameExists] = useState(false);
  const [UsernameAvailable, setUsernameAvailable] = useState(false);
  const [usernameChecking, setUsernameChecking] = useState(false);

  const router = useRouter();

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      if (user?.email) {
        setCurrentUser(user);
        getUserProfile(user.email);
      } else {
        setCurrentUser(null);
        setUserData(null);
        setLoading(false);
        router.push("/");
      }
    });
    return () => unsubscribe();
  }, [router]);

  const getUserProfile = async (email: string) => {
    setLoading(true);
    setError(null);
    try {
      const token = await getFirebaseToken();
      const res = await fetch(`/api/admin?email=${encodeURIComponent(email)}`, {
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
      });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Failed to fetch user data.");
      }
      const data = await res.json();
      setUserData(data.user);
      setFormData(data.user);
    } catch (err: unknown) {
      setError(
        err instanceof Error ? err.message : "An unknown error occurred."
      );
    } finally {
      setLoading(false);
    }
  };

  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>
  ) => {
    const { name, value, type } = e.target;
    setFormData((prev) => {
      if (!prev) return null;
      if (name == "username") {
        setUsernameAvailable(false);
        setUsernameExists(false);
      }
      const isNumeric = [
        "tenthPercentage",
        "twelfthPercentage",
        "collegeGPA",
      ].includes(name);
      return {
        ...prev,
        [name]:
          type === "number"
            ? (isNumeric ? parseFloat(value) : parseInt(value, 10)) || 0
            : value,
      };
    });
  };

  const handleUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (usernameExists) return;
    if (!currentUser?.email || !formData) return;
    if (falseEndYear) return;
    setIsUpdating(true);
    setError(null);
    try {
      const token = await getFirebaseToken();
      const res = await fetch("/api/admin", {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          email: currentUser.email,
          updates: { ...formData },
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to update profile.");

      setUserData(data.user);
      setIsEdit(false);
      setIsPreview(true);
    } catch (err: unknown) {
      const errorMessage =
        err instanceof Error ? err.message : "An unknown error occurred.";
      setError(errorMessage);
      alert(`Update failed: ${errorMessage}`);
    } finally {
      setIsUpdating(false);
    }
  };

  if (loading) {
    return (
      <>
        <Header />
        <main className="min-h-[85vh] flex justify-center items-center">
          <p className="text-xl text-gray-600">Loading your account...</p>
        </main>
        <Footer />
      </>
    );
  }

  if (error || !userData || !formData) {
    return (
      <>
        <Header />
        <main className="min-h-[85vh] flex flex-col justify-center items-center text-center px-4">
          <h2 className="text-2xl font-bold text-red-600 mb-2">
            Could Not Load Profile
          </h2>
          <p className="text-gray-500">
            {error || "No profile data was found."}
          </p>
        </main>
        <Footer />
      </>
    );
  }

  return (
    <>
      <Header />
      <main className="w-[95%] min-h-[85vh] lg:w-full max-w-6xl mx-auto py-10 md:py-16 px-4">
        <h2 className="text-4xl md:text-4xl font-extrabold text-center text-gray-900 mb-12">
          Manage Your Account
        </h2>
        <div className="flex justify-center items-center gap-4 pb-10 font-medium">
          <button
            onClick={() => {
              setIsPreview(false);
              setIsEdit(true);
              setFormData(userData);
            }}
            className={`px-5 md:text-lg py-1 rounded-md border transition duration-300 hover:cursor-pointer ${
              isEdit
                ? "bg-indigo-600 text-white border-indigo-600"
                : "bg-white text-indigo-600 border-indigo-600 hover:bg-indigo-50"
            }`}
          >
            Edit
          </button>
          <button
            onClick={() => {
              setIsEdit(false);
              setIsPreview(true);
              // setUsernameAvailable(false);
              // setUsernameAlreadyTaken(false);
            }}
            className={`px-5 md:text-lg py-1 rounded-md border transition duration-300 hover:cursor-pointer ${
              isPreview
                ? "bg-indigo-600 text-white border-indigo-600"
                : "bg-white text-indigo-600 border-indigo-600 hover:bg-indigo-50"
            }`}
          >
            Preview
          </button>
        </div>
        {isPreview ? (
          <div className="space-y-10 text-center">
            <div className="bg-white p-4 sm:p-6 rounded-xl shadow-md">
              <h3 className="text-3xl font-bold text-gray-800 mb-6">
                {userData.name}
              </h3>

              <div className="border-gray-300 border-1 my-5"></div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 text-left">
                <div>
                  <p className="block font-medium mb-1 text-gray-700">Email</p>
                  <p className="text-lg">{userData.email}</p>
                </div>

                <div>
                  <p className="block font-medium mb-1 text-gray-700">Phone</p>
                  <p className="text-lg">{userData.phone}</p>
                </div>
              </div>
            </div>
          </div>
        ) : null}

        {isEdit ? (
          <div className="space-y-10 text-base md:text-lg">
            <form onSubmit={handleUpdate} className="space-y-8">
              <section className="bg-white p-4 sm:p-6 rounded-xl shadow-md">
                <h3 className="text-2xl font-bold mb-4 text-center text-gray-800 mb-5">
                  Edit your Info
                </h3>

                <div className="space-y-6">
                  <div>
                    <label className="block font-medium mb-1 text-gray-700">
                      Name
                    </label>
                    <input
                      type="text"
                      name="name"
                      value={formData?.name || ""}
                      onChange={handleChange}
                      className="w-full max-w-full border border-gray-300 px-3 py-2 sm:px-4 sm:py-2 rounded-md focus:outline-none focus:ring focus:ring-indigo-200 box-border"
                    />
                  </div>

                  <div>
                    <label className="block font-medium mb-1 text-gray-700">
                      Email
                    </label>
                    <input
                      type="email"
                      name="email"
                      disabled
                      value={formData?.email || ""}
                      onChange={handleChange}
                      className="w-full max-w-full border border-gray-300 px-3 py-2 sm:px-4 sm:py-2 rounded-md focus:outline-none focus:ring focus:ring-indigo-200 box-border disabled:opacity-50"
                    />
                  </div>

                  <div>
                    <label className="block font-medium mb-1 text-gray-700">
                      Phone
                    </label>
                    <input
                      type="number"
                      name="phone"
                      value={formData?.phone || ""}
                      onChange={handleChange}
                      className="w-full max-w-full border border-gray-300 px-3 py-2 sm:px-4 sm:py-2 rounded-md focus:outline-none focus:ring focus:ring-indigo-200 box-border"
                    />
                  </div>
                </div>

                <div className="flex justify-center gap-4 pt-6">
                  <button
                    type="submit"
                    disabled={isUpdating}
                    className={`px-5 py-2 bg-indigo-600 text-white rounded-md hover:bg-indigo-700 transition disabled:opacity-50 cursor-pointer ${
                      isUpdating ? "opacity-50 cursor-not-allowed" : ""
                    }`}
                  >
                    {isUpdating ? "Updating..." : "Save Changes"}
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setIsEdit(false);
                      setIsPreview(true);
                    }}
                    className="px-5 py-2 bg-gray-300 text-gray-800 rounded-md hover:bg-gray-400 transition cursor-pointer"
                  >
                    Cancel
                  </button>
                </div>
              </section>
            </form>
          </div>
        ) : null}
      </main>
      <Footer />
    </>
  );
}
