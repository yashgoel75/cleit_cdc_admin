"use client";
import "../page.css";
import Header from "../../Header/page";
import Footer from "@/app/Footer/page";
import { useState, useEffect } from "react";
import { onAuthStateChanged, User } from "firebase/auth";
import { auth } from "@/lib/firebase";
import { useRouter } from "next/navigation";
import dynamic from "next/dynamic";

const QuillEditor = dynamic(() => import("@/components/TestEditor"), {
  ssr: false,
});

export default function Tests() {
  interface Test {
    _id?: string;
    title: string;
    description: string;
    date: string;
    duration: string;
    mode: string;
    link: string;
  }

  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [tests, setTests] = useState<Test[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [formData, setFormData] = useState<Test>({
    title: "",
    description: "",
    date: "",
    duration: "",
    mode: "Online",
    link: "",
  });
  const [editingId, setEditingId] = useState<string | null>(null);
  const [isAdding, setIsAdding] = useState(false);
  const [testIdToDelete, setTestIdToDelete] = useState<string | null>(null);
  const router = useRouter();

  const fetchTests = async (email: string | null | undefined) => {
    try {
      const res = await fetch(
        `/api/tests?email=${encodeURIComponent(email || "")}`
      );
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to fetch tests");
      setTests(data.tests);
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
        fetchTests(user.email);
      } else {
        router.push("/");
      }
    });
    return () => unsub();
  }, [router]);

  const handleSubmit = async () => {
    if (!currentUser) return;
    const body = editingId
      ? { testId: editingId, updates: formData, adminEmail: currentUser.email }
      : { newTest: formData, adminEmail: currentUser.email };
    const method = editingId ? "PATCH" : "POST";
    const res = await fetch("/api/tests", {
      method,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    if (res.ok) {
      setFormData({
        title: "",
        description: "",
        date: "",
        duration: "",
        mode: "Online",
        link: "",
      });
      setEditingId(null);
      setIsAdding(false);
      fetchTests(currentUser.email);
    }
  };

  const handleDelete = async (id: string) => {
    if (!currentUser) return;
    const res = await fetch("/api/tests", {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ testId: id, adminEmail: currentUser.email }),
    });
    if (res.ok) fetchTests(currentUser.email);
  };

  return (
    <>
      <Header />
      <main className="w-[95%] min-h-[85vh] lg:w-full max-w-7xl mx-auto py-10 md:py-16 px-4">
        <h2 className="text-4xl md:text-4xl font-extrabold text-center text-gray-900 mb-12">
          Manage Tests
        </h2>

        <div className="flex justify-center mb-8">
          <button
            onClick={() => {
              setFormData({
                title: "",
                description: "",
                date: "",
                duration: "",
                mode: "Online",
                link: "",
              });
              setEditingId(null);
              setTestIdToDelete(null);
              setIsAdding(true);
            }}
            className="bg-indigo-500 hover:indigo-700 text-white font-semibold px-8 py-3 rounded-lg shadow-lg transition-all duration-300 transform hover:scale-105 cursor-pointer"
          >
            + Add New Test
          </button>
        </div>

        {(isAdding || editingId) && (
          <div className="mb-12 bg-white p-8 rounded-2xl shadow-xl border border-gray-100 max-w-5xl mx-auto">
            <div className="flex items-center justify-center mb-8">
              <div className="p-1 rounded-xl">
                <div className="bg-white px-6 py-2 rounded-lg">
                  <h3 className="text-xl font-bold text-gray-800">
                    {editingId ? "Edit Test" : "Create New Test"}
                  </h3>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
              {/* Left Column - Basic Info */}
              <div className="space-y-2">
                <div className="bg-gray-50 p-6 rounded-xl">
                  <h4 className="text-lg font-semibold text-gray-700 mb-4 flex items-center">
                    <span className="bg-blue-100 p-2 rounded-lg mr-3">📝</span>
                    Basic Information
                  </h4>
                  <div className="space-y-4">
                    {[
                      { name: "title", label: "Test Title", type: "text", icon: "🎯" },
                      { name: "date", label: "Test Date", type: "date", icon: "📅" },
                      { name: "duration", label: "Duration (e.g., 2 hours)", type: "text", icon: "⏰" },
                      { name: "mode", label: "Test Mode", type: "text", icon: "💻" },
                      { name: "link", label: "Test Link/URL", type: "url", icon: "🔗" }
                    ].map(({ name, label, type, icon }) => (
                      <div key={name} className="group">
                        <label
                          htmlFor={name}
                          className="block text-sm font-semibold text-gray-700 mb-2 flex items-center"
                        >
                          <span className="mr-2">{icon}</span>
                          {label}
                        </label>
                        <input
                          id={name}
                          type={type}
                          value={formData[name as keyof Test]}
                          onChange={(e) =>
                            setFormData({ ...formData, [name]: e.target.value })
                          }
                          placeholder={`Enter ${label.toLowerCase()}`}
                          className="w-full p-4 border-2 border-gray-200 rounded-xl focus:border-blue-500 focus:ring-4 focus:ring-blue-100 transition-all duration-300 bg-white shadow-sm hover:shadow-md"
                        />
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              {/* Right Column - Description */}
              <div className="lg:col-span-1">
                <div className="bg-gradient-to-br from-purple-50 to-indigo-50 p-6 rounded-xl border-2 border-purple-100 h-full">
                  <h4 className="text-lg font-semibold text-gray-700 mb-4 flex items-center">
                    <span className="bg-purple-100 p-2 rounded-lg mr-3">📖</span>
                    Test Description
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
                    Add detailed instructions, topics covered, and important notes (recommended: ~200 words)
                  </p>
                </div>
              </div>
            </div>

            {/* Action Buttons */}
            <div className="flex gap-4 justify-center mt-8 pt-6 border-t border-gray-200">
              <button
                onClick={handleSubmit}
                className="bg-green-500 hover:bg-green-600 text-white font-semibold px-8 py-3 rounded-xl shadow-lg transition-all duration-300 transform hover:scale-105 flex items-center cursor-pointer"
              >
                {editingId ? "Update Test" : "Create Test"}
              </button>
              <button
                onClick={() => {
                  setFormData({
                    title: "",
                    description: "",
                    date: "",
                    duration: "",
                    mode: "Online",
                    link: "",
                  });
                  setEditingId(null);
                  setIsAdding(false);
                }}
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
            <p className="text-lg text-gray-600">Loading tests...</p>
          </div>
        ) : error ? (
          <div className="text-center py-8">
            <div className="bg-red-50 border border-red-200 rounded-xl p-6 max-w-md mx-auto">
              <span className="text-4xl mb-2 block">❌</span>
              <p className="text-red-700 font-semibold">{error}</p>
            </div>
          </div>
        ) : tests.length === 0 ? (
          <div className="text-center py-12">
            <div className="bg-gray-50 rounded-2xl p-8 max-w-md mx-auto">
              <span className="text-6xl mb-4 block">📝</span>
              <p className="text-xl text-gray-600 font-medium">No tests found</p>
              <p className="text-gray-500 mt-2">Click &quot;Add New Test&quot; to get started!</p>
            </div>
          </div>
        ) : (
          <section className="grid gap-8 sm:grid-cols-2 lg:grid-cols-3">
            {tests.map((test) => (
              <div
                key={test._id}
                className="bg-white border-2 border-gray-100 rounded-2xl shadow-lg p-6 hover:shadow-2xl hover:border-indigo-200 transition-all duration-300 transform hover:-translate-y-1"
              >
                <div className="flex items-start justify-between mb-4">
                  <h3 className="text-xl font-bold text-gray-800 flex-1">{test.title}</h3>
                  <div className="bg-indigo-100 text-indigo-800 px-3 py-1 rounded-full text-sm font-semibold">
                    {test.mode}
                  </div>
                </div>
                
                <div className="space-y-3 mb-6 relative">
                  <div className="flex items-center text-gray-600">
                    <span className="mr-2">📅</span>
                    <span className="font-medium">Date:</span>
                    <span className="ml-2">{test.date}</span>
                  </div>
                  <div className="flex items-center text-gray-600">
                    <span className="mr-2">⏰</span>
                    <span className="font-medium">Duration:</span>
                    <span className="ml-2">{test.duration}</span>
                  </div>
                </div>

                <div className="mb-4">
                  <div className="flex items-center mb-2">
                    <span className="mr-2">📖</span>
                    <span className="font-semibold text-gray-700">Description:</span>
                  </div>
                  <div className="bg-gray-50 p-3 rounded-lg max-h-32 overflow-y-auto">
                    <div
                      className="text-sm text-gray-700 leading-relaxed"
                      dangerouslySetInnerHTML={{ __html: test.description }}
                    />
                  </div>
                </div>

                <div className="flex bottom-0 relative gap-3 pt-4 border-t border-gray-200">
                  <button
                    onClick={() => {
                      setFormData(test);
                      setEditingId(test._id!);
                      setIsAdding(false);
                    }}
                    className="flex-1 bg-blue-50 text-blue-700 hover:bg-blue-100 font-medium py-2 px-4 rounded-lg transition-colors duration-200 flex items-center justify-center cursor-pointer"
                  >
                    Edit
                  </button>
                  <button
                    onClick={() => setTestIdToDelete(test._id!)}
                    className="flex-1 bg-red-50 text-red-700 hover:bg-red-100 font-medium py-2 px-4 rounded-lg transition-colors duration-200 flex items-center justify-center cursor-pointer"
                  >
                    Delete
                  </button>
                </div>

                {testIdToDelete === test._id && (
                  <div className="mt-4 p-4 bg-red-50 border border-red-200 rounded-lg">
                    <p className="text-red-800 font-medium mb-3 flex items-center">
                      Are you sure you want to delete this test?
                    </p>
                    <div className="flex gap-3">
                      <button
                        onClick={() => handleDelete(test._id!)}
                        className="bg-red-600 hover:bg-red-700 text-white px-4 py-2 rounded-md font-medium transition-colors duration-200 cursor-pointer"
                      >
                        Yes, Delete
                      </button>
                      <button
                        onClick={() => setTestIdToDelete(null)}
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