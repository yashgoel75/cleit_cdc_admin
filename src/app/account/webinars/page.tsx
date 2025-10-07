"use client";
import "../page.css";
import Header from "../../Header/page";
import Footer from "@/app/Footer/page";
import { useState, useEffect } from "react";
import { onAuthStateChanged, User } from "firebase/auth";
import { auth } from "@/lib/firebase";
import { useRouter } from "next/navigation";
import dynamic from "next/dynamic";
import Link from "next/link";
import { getFirebaseToken } from "@/utils";

const QuillEditor = dynamic(() => import("@/components/TestEditor"), {
  ssr: false,
});

export default function Webinars() {
  interface Webinar {
    _id?: string;
    title: string;
    description: string;
    date: string;
    time: string;
    duration: string;
    mode: string;
    link: string;
    studentsApplied?: string[];
  }

  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [webinars, setWebinars] = useState<Webinar[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formData, setFormData] = useState<Webinar>({
    title: "",
    description: "",
    date: "",
    time: "",
    duration: "",
    mode: "Online",
    link: "",
  });

  const [editingId, setEditingId] = useState<string | null>(null);
  const [isAdding, setIsAdding] = useState(false);
  const [webinarIdToDelete, setWebinarIdToDelete] = useState<string | null>(null);
  const [copyWebinarId, setCopyWebinarId] = useState<string | null>(null);
  const [isCopied, setIsCopied] = useState(false);
  const [showList, setShowList] = useState(false);
  const router = useRouter();

  const fetchWebinars = async (email: string | null | undefined) => {
    try {
      const token = await getFirebaseToken();
      const res = await fetch(
        `/api/webinars?email=${encodeURIComponent(email || "")}`,
        {
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
        }
      );
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to fetch webinars");
      setWebinars(data.webinars);
      setError(null);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Unexpected error");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, (user) => {
      if (user) {
        setCurrentUser(user);
        fetchWebinars(user.email);
      } else {
        router.push("/");
      }
    });
    return () => unsub();
  }, [router]);

  const resetFormData = () => {
    setFormData({
      title: "",
      description: "",
      date: "",
      time: "",
      duration: "",
      mode: "Online",
      link: "",
    });
  };

  const handleSubmit = async () => {
    if (!currentUser) return;
    setIsSubmitting(true);

    try {
      const body = editingId
        ? {
            webinarId: editingId,
            updates: formData,
            adminEmail: currentUser.email,
          }
        : { newWebinar: formData, adminEmail: currentUser.email };

      const method = editingId ? "PATCH" : "POST";
      const token = await getFirebaseToken();
      const res = await fetch("/api/webinars", {
        method,
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(body),
      });

      if (res.ok) {
        resetFormData();
        setEditingId(null);
        setIsAdding(false);
        fetchWebinars(currentUser.email);
      }
    } catch (error) {
      console.error("Failed to submit the webinar:", error);
      setError("Failed to submit the webinar. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!currentUser) return;
    const token = await getFirebaseToken();
    const res = await fetch("/api/webinars", {
      method: "DELETE",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({ webinarId: id, adminEmail: currentUser.email }),
    });
    if (res.ok) fetchWebinars(currentUser.email);
  };

  const copyWebinarLink = async (webinarId: string) => {
    const webinarUrl = `https://cdc.cleit.in/account/webinars/${webinarId}`;

    try {
      await navigator.clipboard.writeText(webinarUrl);
      setCopyWebinarId(webinarId);
      setIsCopied(true);
      setTimeout(() => {
        setIsCopied(false);
      }, 1500);
    } catch (err) {
      console.error("Failed to copy: ", err);
      const textArea = document.createElement("textarea");
      textArea.value = webinarUrl;
      document.body.appendChild(textArea);
      textArea.focus();
      textArea.select();
      try {
        document.execCommand("copy");
        alert("Webinar link copied to clipboard!");
      } catch (fallbackErr) {
        console.error("Fallback copy failed: ", fallbackErr);
        alert("Failed to copy link. Please copy manually: " + webinarUrl);
      }
      document.body.removeChild(textArea);
    }
  };

  const getWebinarStatus = (date: string) => {
    if (!date) return null;
    const webinarDate = new Date(date);
    const today = new Date();
    const diffTime = webinarDate.getTime() - today.getTime();
    const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));

    if (diffDays < 0) return { color: "gray", text: "Completed" };
    if (diffDays === 0) return { color: "red", text: "Today" };
    if (diffDays <= 3) return { color: "orange", text: `${diffDays}d left` };
    if (diffDays <= 7) return { color: "yellow", text: `${diffDays}d left` };
    return { color: "green", text: `${diffDays}d left` };
  };

  return (
    <>
      <Header />
      <main className="w-[95%] min-h-[85vh] lg:w-full max-w-7xl mx-auto py-10 md:py-16 px-4">
        <h2 className="text-4xl md:text-4xl font-extrabold text-center text-gray-900 mb-12">
          Manage Webinars
        </h2>

        <div className="flex justify-center mb-8">
          <button
            onClick={() => {
              resetFormData();
              setEditingId(null);
              setWebinarIdToDelete(null);
              setIsAdding(true);
            }}
            className="bg-indigo-500 hover:bg-indigo-700 text-white font-semibold px-8 py-3 rounded-lg shadow-lg transition-all duration-300 transform hover:scale-105 cursor-pointer"
          >
            + Add New Webinar
          </button>
        </div>

        {(isAdding || editingId) && (
          <div className="mb-12 bg-white p-8 rounded-2xl shadow-xl border border-gray-100 max-w-6xl mx-auto">
            <div className="flex items-center justify-center mb-8">
              <div className="bg-white px-6 py-2 rounded-lg">
                <h3 className="text-2xl font-bold text-gray-800">
                  {editingId ? "Edit Webinar" : "Create New Webinar"}
                </h3>
              </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
              <div className="space-y-6">
                <div className="bg-gradient-to-br from-indigo-50 to-purple-50 p-6 rounded-xl border-2 border-indigo-100">
                  <h4 className="text-lg font-semibold text-gray-700 mb-4 flex items-center">
                    <span className="bg-indigo-100 p-2 rounded-lg mr-3">
                      🎥
                    </span>
                    Webinar Details
                  </h4>

                  <div className="space-y-4">
                    <div className="group">
                      <label
                        htmlFor="title"
                        className="block text-sm font-semibold text-gray-700 mb-2 flex items-center"
                      >
                        <span className="mr-2">📌</span>
                        Webinar Title
                      </label>
                      <input
                        id="title"
                        type="text"
                        value={formData.title}
                        onChange={(e) =>
                          setFormData({ ...formData, title: e.target.value })
                        }
                        placeholder="Enter webinar title"
                        className="w-full p-4 border-2 border-gray-200 rounded-xl focus:border-indigo-500 focus:ring-4 focus:ring-indigo-100 transition-all duration-300 bg-white shadow-sm hover:shadow-md"
                      />
                    </div>

                    <div className="group">
                      <label
                        htmlFor="mode"
                        className="block text-sm font-semibold text-gray-700 mb-2 flex items-center"
                      >
                        <span className="mr-2">💻</span>
                        Mode
                      </label>
                      <select
                        id="mode"
                        value={formData.mode}
                        onChange={(e) =>
                          setFormData({ ...formData, mode: e.target.value })
                        }
                        className="w-full p-4 border-2 border-gray-200 rounded-xl focus:border-indigo-500 focus:ring-4 focus:ring-indigo-100 transition-all duration-300 bg-white shadow-sm hover:shadow-md"
                      >
                        <option value="Online">Online</option>
                        <option value="Offline">Offline</option>
                        <option value="Hybrid">Hybrid</option>
                      </select>
                    </div>

                    <div className="group">
                      <label
                        htmlFor="link"
                        className="block text-sm font-semibold text-gray-700 mb-2 flex items-center"
                      >
                        <span className="mr-2">🔗</span>
                        Webinar Link
                      </label>
                      <input
                        id="link"
                        type="url"
                        value={formData.link}
                        onChange={(e) =>
                          setFormData({ ...formData, link: e.target.value })
                        }
                        placeholder="https://zoom.us/j/..."
                        className="w-full p-4 border-2 border-gray-200 rounded-xl focus:border-indigo-500 focus:ring-4 focus:ring-indigo-100 transition-all duration-300 bg-white shadow-sm hover:shadow-md"
                      />
                    </div>
                  </div>
                </div>

                <div className="bg-gradient-to-br from-blue-50 to-cyan-50 p-6 rounded-xl border-2 border-blue-100">
                  <h4 className="text-lg font-semibold text-gray-700 mb-4 flex items-center">
                    <span className="bg-blue-100 p-2 rounded-lg mr-3">📅</span>
                    Schedule
                  </h4>
                  <div className="space-y-4">
                    <div className="group">
                      <label
                        htmlFor="date"
                        className="block text-sm font-semibold text-gray-700 mb-2 flex items-center"
                      >
                        <span className="mr-2">📆</span>
                        Date
                      </label>
                      <input
                        id="date"
                        type="date"
                        value={formData.date}
                        onChange={(e) =>
                          setFormData({ ...formData, date: e.target.value })
                        }
                        className="w-full p-4 border-2 border-gray-200 rounded-xl focus:border-blue-500 focus:ring-4 focus:ring-blue-100 transition-all duration-300 bg-white shadow-sm hover:shadow-md"
                      />
                    </div>

                    <div className="group">
                      <label
                        htmlFor="time"
                        className="block text-sm font-semibold text-gray-700 mb-2 flex items-center"
                      >
                        <span className="mr-2">🕐</span>
                        Time
                      </label>
                      <input
                        id="time"
                        type="time"
                        value={formData.time}
                        onChange={(e) =>
                          setFormData({ ...formData, time: e.target.value })
                        }
                        className="w-full p-4 border-2 border-gray-200 rounded-xl focus:border-blue-500 focus:ring-4 focus:ring-blue-100 transition-all duration-300 bg-white shadow-sm hover:shadow-md"
                      />
                    </div>

                    <div className="group">
                      <label
                        htmlFor="duration"
                        className="block text-sm font-semibold text-gray-700 mb-2 flex items-center"
                      >
                        <span className="mr-2">⏱️</span>
                        Duration
                      </label>
                      <input
                        id="duration"
                        type="text"
                        value={formData.duration}
                        onChange={(e) =>
                          setFormData({ ...formData, duration: e.target.value })
                        }
                        placeholder="e.g., 1 hour, 90 minutes"
                        className="w-full p-4 border-2 border-gray-200 rounded-xl focus:border-blue-500 focus:ring-4 focus:ring-blue-100 transition-all duration-300 bg-white shadow-sm hover:shadow-md"
                      />
                    </div>
                  </div>
                </div>
              </div>

              <div className="lg:col-span-1">
                <div className="bg-gradient-to-br from-purple-50 to-pink-50 p-6 rounded-xl border-2 border-purple-100 h-full">
                  <h4 className="text-lg font-semibold text-gray-700 mb-4 flex items-center">
                    <span className="bg-purple-100 p-2 rounded-lg mr-3">
                      📝
                    </span>
                    Webinar Description
                  </h4>

                  <div className="bg-white rounded-xl p-2 shadow-sm">
                    <QuillEditor
                      key={editingId || "new"}
                      value={formData.description}
                      onChange={(html) =>
                        setFormData((prev) => ({ ...prev, description: html }))
                      }
                    />
                  </div>
                  <p className="text-xs text-gray-500 mt-2 flex items-center">
                    <span className="mr-1">💡</span>
                    Include webinar topics, speaker details, learning outcomes,
                    and what attendees can expect
                  </p>
                </div>
              </div>
            </div>

            <div className="flex gap-4 justify-center mt-8 pt-6 border-t border-gray-200">
              <button
                onClick={handleSubmit}
                disabled={isSubmitting}
                className={`${
                  isSubmitting
                    ? "bg-indigo-400 cursor-not-allowed"
                    : "bg-indigo-500 hover:bg-indigo-600"
                } text-white font-semibold px-8 py-3 rounded-xl shadow-lg transition-all duration-300 transform hover:scale-105 flex items-center cursor-pointer`}
              >
                {isSubmitting
                  ? "Saving..."
                  : editingId
                  ? "Update Webinar"
                  : "Create Webinar"}
              </button>
              <button
                onClick={() => {
                  resetFormData();
                  setEditingId(null);
                  setIsAdding(false);
                }}
                disabled={isSubmitting}
                className="bg-gray-400 hover:bg-gray-500 text-white font-semibold px-8 py-3 rounded-xl shadow-lg transition-all duration-300 transform hover:scale-105 flex items-center cursor-pointer"
              >
                Cancel
              </button>
            </div>
          </div>
        )}

        {loading ? (
          <div className="text-center py-12">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600 mx-auto mb-4"></div>
            <p className="text-lg text-gray-600">Loading webinars...</p>
          </div>
        ) : error ? (
          <div className="text-center py-8">
            <div className="bg-red-50 border border-red-200 rounded-xl p-6 max-w-md mx-auto">
              <p className="text-red-700 font-semibold">{error}</p>
            </div>
          </div>
        ) : webinars.length === 0 ? (
          <div className="text-center py-12">
            <div className="bg-gray-50 rounded-2xl p-8 max-w-md mx-auto">
              <span className="text-6xl mb-4 block">🎥</span>
              <p className="text-xl text-gray-600 font-medium">
                No webinars found
              </p>
              <p className="text-gray-500 mt-2">
                Click &quot;Add New Webinar&quot; to create your first webinar!
              </p>
            </div>
          </div>
        ) : (
          <section className="grid gap-8 sm:grid-cols-2 lg:grid-cols-3">
            {webinars.map((webinar) => (
              <div
                key={webinar._id}
                className="bg-white border-2 border-gray-100 rounded-2xl shadow-lg p-6 hover:shadow-2xl hover:border-indigo-200 transition-all duration-300 transform hover:-translate-y-1"
              >
                <div className="flex items-start justify-between mb-4">
                  <div className="flex-1">
                    <h3 className="text-xl font-bold text-gray-800 mb-1">
                      {webinar.title}
                    </h3>
                    {webinar.mode && (
                      <span className="inline-block bg-indigo-100 text-indigo-800 px-3 py-1 rounded-full text-sm font-semibold">
                        {webinar.mode}
                      </span>
                    )}
                  </div>
                </div>

                <div className="space-y-2 mb-6">
                  <div className="flex items-center text-gray-600">
                    <span className="font-medium">Date:</span>
                    <span className="ml-2">
                      {webinar.date
                        ? new Date(webinar.date).toLocaleDateString("en-US", {
                            year: "numeric",
                            month: "short",
                            day: "numeric",
                          })
                        : "TBA"}
                    </span>
                    {(() => {
                      const status = getWebinarStatus(webinar.date);
                      return (
                        status && (
                          <span
                            className={`ml-2 px-2 py-0.5 rounded-full text-xs font-bold ${
                              status.color === "gray"
                                ? "bg-gray-100 text-gray-800"
                                : status.color === "red"
                                ? "bg-red-100 text-red-800"
                                : status.color === "orange"
                                ? "bg-orange-100 text-orange-800"
                                : status.color === "yellow"
                                ? "bg-yellow-100 text-yellow-800"
                                : "bg-green-100 text-green-800"
                            }`}
                          >
                            {status.text}
                          </span>
                        )
                      );
                    })()}
                  </div>

                  {webinar.time && (
                    <div className="flex items-center text-gray-600">
                      <span className="font-medium">Time:</span>
                      <span className="ml-2">{webinar.time}</span>
                    </div>
                  )}

                  {webinar.duration && (
                    <div className="flex items-center text-gray-600">
                      <span className="font-medium">Duration:</span>
                      <span className="ml-2">{webinar.duration}</span>
                    </div>
                  )}

                  {webinar.link && (
                    <div className="flex items-center text-gray-600">
                      <span className="font-medium">Link:</span>
                      <a
                        href={webinar.link}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="ml-2 text-indigo-600 hover:text-indigo-800 underline text-sm truncate"
                      >
                        Join Webinar
                      </a>
                    </div>
                  )}
                </div>

                <div className="mb-4">
                  <div className="flex items-center mb-2">
                    <span className="font-semibold text-gray-700">
                      Description:
                    </span>
                  </div>
                  <div className="bg-gray-50 p-3 rounded-lg max-h-32 overflow-y-auto">
                    <div
                      className="text-sm text-gray-700 leading-relaxed"
                      dangerouslySetInnerHTML={{ __html: webinar.description }}
                    />
                  </div>
                </div>

                <div className="flex gap-3 pt-4 border-t border-gray-200">
                  <button
                    onClick={() => {
                      setFormData(webinar);
                      setEditingId(webinar._id!);
                      setIsAdding(false);
                    }}
                    className="flex-1 bg-blue-50 text-blue-700 hover:bg-blue-100 font-medium py-2 px-4 rounded-lg transition-colors duration-200 flex items-center justify-center cursor-pointer"
                  >
                    Edit
                  </button>
                  <button
                    onClick={() => setWebinarIdToDelete(webinar._id!)}
                    className="flex-1 bg-red-50 text-red-700 hover:bg-red-100 font-medium py-2 px-4 rounded-lg transition-colors duration-200 flex items-center justify-center cursor-pointer"
                  >
                    Delete
                  </button>
                </div>

                {webinar.studentsApplied && webinar.studentsApplied.length > 0 && (
                  <div className="mt-4 text-center">
                    <div className="bg-green-100 px-4 py-1 rounded-full text-green-800 text-xs font-medium inline-flex items-center">
                      {webinar.studentsApplied.length} student
                      {webinar.studentsApplied.length !== 1 ? "s" : ""} registered
                    </div>
                  </div>
                )}

                <div className="flex gap-3 pt-2">
                  <div
                    onClick={() => copyWebinarLink(webinar._id!)}
                    className="bg-purple-100 flex-1 text-purple-800 hover:bg-purple-200 font-medium py-2 px-4 rounded-lg transition-colors duration-200 flex items-center justify-center cursor-pointer"
                  >
                    <button className="cursor-pointer">
                      {isCopied && copyWebinarId === webinar._id
                        ? "Copied"
                        : "Copy Link"}
                    </button>
                  </div>
                </div>

                <div className="text-center flex justify-center pt-4">
                  <div className="bg-blue-100 px-4 py-1 rounded-full text-blue-800 text-xs font-medium inline-flex items-center">
                    <Link
                      href={`/account/webinars/${webinar._id}`}
                      onClick={() => setShowList(true)}
                    >
                      {showList ? "Loading..." : "View Registered Students"}
                    </Link>
                  </div>
                </div>

                {webinarIdToDelete === webinar._id && (
                  <div className="mt-4 p-4 bg-red-50 border border-red-200 rounded-lg">
                    <p className="text-red-800 font-medium mb-3 flex items-center">
                      <span className="mr-2">⚠️</span>
                      Are you sure you want to delete this webinar?
                    </p>
                    <div className="flex gap-3">
                      <button
                        onClick={() => handleDelete(webinar._id!)}
                        className="bg-red-600 hover:bg-red-700 text-white px-4 py-2 rounded-md font-medium transition-colors duration-200 cursor-pointer"
                      >
                        Yes, Delete
                      </button>
                      <button
                        onClick={() => setWebinarIdToDelete(null)}
                        className="bg-gray-300 hover:bg-gray-400 text-gray-700 px-4 py-2 rounded-md font-medium transition-colors duration-200 cursor-pointer"
                      >
                        Cancel
                      </button>
                    </div>
                  </div>
                )}
              </div>
            ))}
          </section>
        )}
      </main>
      <Footer />
    </>
  );
}