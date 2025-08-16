"use client";

import "../page.css";
import Header from "../../Header/page";
import Footer from "@/app/Footer/page";
import { useState, useEffect } from "react";
import { onAuthStateChanged, User } from "firebase/auth";
import { auth } from "@/lib/firebase";
import { useRouter } from "next/navigation";

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
  }, []);

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
      <main className="w-[95%] min-h-[85vh] lg:w-full max-w-6xl mx-auto py-10 md:py-16 px-4">
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
            className="bg-indigo-500 hover:bg-indigo-700 text-white px-6 py-2 rounded-md cursor-pointer"
          >
            + Add Test
          </button>
        </div>

        {(isAdding || editingId) && (
          <div className="mb-10 bg-gray-50 p-6 rounded-lg shadow-md max-w-xl mx-auto">
            <h3 className="text-xl font-semibold mb-4 text-center">
              {editingId ? "Edit Test" : "Add New Test"}
            </h3>
            <div className="grid grid-cols-1 gap-4">
              {[
                { name: "title", label: "Test Title", type: "text" },
                { name: "description", label: "Description", type: "text" },
                { name: "date", label: "Test Date", type: "date" },
                { name: "duration", label: "Duration", type: "text" },
                {
                  name: "mode",
                  label: "Mode (e.g. Online/Offline)",
                  type: "text",
                },
                { name: "link", label: "Test Link", type: "text" },
              ].map(({ name, label, type }) => (
                <div key={name} className="flex flex-col">
                  <label
                    htmlFor={name}
                    className="mb-1 font-medium text-gray-700"
                  >
                    {label}
                  </label>
                  <input
                    id={name}
                    type={type}
                    value={formData[name as keyof Test]}
                    onChange={(e) =>
                      setFormData({ ...formData, [name]: e.target.value })
                    }
                    placeholder={label}
                    className="p-3 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              ))}

              <div className="flex gap-4 justify-center mt-2">
                <button
                  onClick={handleSubmit}
                  className="bg-blue-600 text-white px-5 py-2 rounded-md cursor-pointer"
                >
                  {editingId ? "Update" : "Add"}
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
                  className="bg-gray-300 px-5 py-2 rounded-md cursor-pointer"
                >
                  Cancel
                </button>
              </div>
            </div>
          </div>
        )}

        {loading ? (
          <p className="text-center text-gray-600">Loading tests...</p>
        ) : error ? (
          <p className="text-center text-red-500">{error}</p>
        ) : tests.length === 0 ? (
          <p className="text-center text-gray-600">No tests found.</p>
        ) : (
          <section className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {tests.map((test) => (
              <div
                key={test._id}
                className="bg-white border rounded-xl shadow-md p-6 hover:shadow-xl"
              >
                <h3 className="text-2xl font-semibold mb-2">{test.title}</h3>
                <p>
                  <span className="font-medium">Date:</span> {test.date}
                </p>
                <p>
                  <span className="font-medium">Duration:</span> {test.duration}
                </p>
                <p>
                  <span className="font-medium">Mode:</span> {test.mode}
                </p>
                <div className="flex gap-4 mt-4">
                  <button
                    onClick={() => {
                      setFormData(test);
                      setEditingId(test._id!);
                    }}
                    className="text-blue-600 hover:underline cursor-pointer"
                  >
                    Edit
                  </button>
                  <button
                    onClick={() => setTestIdToDelete(test._id!)}
                    className="text-red-600 hover:underline cursor-pointer"
                  >
                    Delete
                  </button>
                </div>
                {testIdToDelete === test._id && (
                  <div className="mt-2 text-red-600">
                    Are you sure?
                    <div className="flex gap-4">
                      <button
                        onClick={() => handleDelete(test._id!)}
                        className="hover:cursor-pointer"
                      >
                        Yes
                      </button>
                      <button
                        onClick={() => setTestIdToDelete(null)}
                        className="cursor-pointer"
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
