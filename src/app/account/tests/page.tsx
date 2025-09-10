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
    deadline: string;
    duration: string;
    mode: string;
    link: string;
    pdfUrl: string;
    extraFields?: { fieldName: string; fieldValue: string }[];
  }

  const [pdfFile, setPdfFile] = useState<File | null>(null);
  const [pdfUrl, setPdfUrl] = useState<string>("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [tests, setTests] = useState<Test[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [formData, setFormData] = useState<Test>({
    title: "",
    description: "",
    date: "",
    deadline: "",
    duration: "",
    mode: "Online",
    link: "",
    pdfUrl: "",
    extraFields: [],
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

  const addExtraField = () => {
    setFormData({
      ...formData,
      extraFields: [
        ...(formData.extraFields || []),
        { fieldName: "", fieldValue: "" },
      ],
    });
  };

  const removeExtraField = (index: number) => {
    const newExtraFields = [...(formData.extraFields || [])];
    newExtraFields.splice(index, 1);
    setFormData({
      ...formData,
      extraFields: newExtraFields,
    });
  };

  const updateExtraField = (
    index: number,
    field: "fieldName" | "fieldValue",
    value: string
  ) => {
    const newExtraFields = [...(formData.extraFields || [])];
    newExtraFields[index] = { ...newExtraFields[index], [field]: value };
    setFormData({
      ...formData,
      extraFields: newExtraFields,
    });
  };

  const resetFormData = () => {
    setFormData({
      title: "",
      description: "",
      date: "",
      deadline: "",
      duration: "",
      mode: "Online",
      link: "",
      pdfUrl: "",
      extraFields: [],
    });
    setPdfUrl("");
  };

  const uploadPdfToCloudinary = async (): Promise<string> => {
    if (!pdfFile || !currentUser) return "";

    const PdfformData = new FormData();
    const publicId = `test_pdf_${Date.now()}`;
    const folder = "test_pdfs";

    const signatureRes = await fetch("/api/signtest", {
      method: "POST",
      headers: {
        // Authorization: `Bearer ${await currentUser.getIdToken()}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ folder, public_id: publicId }),
    });

    const { signature, timestamp, apiKey } = await signatureRes.json();

    PdfformData.append("file", pdfFile);
    PdfformData.append("api_key", apiKey);
    PdfformData.append("timestamp", timestamp.toString());
    PdfformData.append("signature", signature);
    PdfformData.append("public_id", publicId);
    PdfformData.append("folder", folder);

    const cloudRes = await fetch(
      `https://api.cloudinary.com/v1_1/${process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME}/auto/upload`,
      {
        method: "POST",
        body: PdfformData,
      }
    );

    const cloudData = await cloudRes.json();
    const url = cloudData.secure_url;
    setFormData((prev) => (prev ? { ...prev, pdfUrl: url } : prev));
    return typeof url === "string" ? url : "";
  };

  const handleSubmit = async () => {
    if (!currentUser) return;
    setIsSubmitting(true);

    try {
      let finalPdfUrl = formData.pdfUrl || "";

      if (pdfFile) {
        finalPdfUrl = await uploadPdfToCloudinary();
      }

      const dataToSend = {
        ...formData,
        pdfUrl: finalPdfUrl,
      };

      const otherExtraFields =
        dataToSend.extraFields?.filter(
          (field) => field.fieldName !== "Test PDF"
        ) || [];

      if (finalPdfUrl) {
        dataToSend.extraFields = [
          ...otherExtraFields,
          { fieldName: "Test PDF", fieldValue: finalPdfUrl },
        ];
      } else {
        dataToSend.extraFields = otherExtraFields;
      }

      const body = editingId
        ? {
            testId: editingId,
            updates: dataToSend,
            adminEmail: currentUser.email,
          }
        : { newTest: dataToSend, adminEmail: currentUser.email };

      const method = editingId ? "PATCH" : "POST";

      const res = await fetch("/api/tests", {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });

      if (res.ok) {
        resetFormData();
        setPdfFile(null);
        setPdfUrl("");
        setEditingId(null);
        setIsAdding(false);
        fetchTests(currentUser.email);
      }
    } catch (error) {
      console.error("Failed to submit the test:", error);
      setError("Failed to submit the test. Please try again.");
    } finally {
      setIsSubmitting(false);
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
          Manage Tests, Hackathons & Challenges
        </h2>

        <div className="flex justify-center mb-8">
          <button
            onClick={() => {
              resetFormData();
              setEditingId(null);
              setTestIdToDelete(null);
              setIsAdding(true);
            }}
            className="bg-indigo-500 hover:bg-indigo-700 text-white font-semibold px-8 py-3 rounded-lg shadow-lg transition-all duration-300 transform hover:scale-105 cursor-pointer"
          >
            + Add New Challenge
          </button>
        </div>

        {(isAdding || editingId) && (
          <div className="mb-12 bg-white p-8 rounded-2xl shadow-xl border border-gray-100 max-w-6xl mx-auto">
            <div className="flex items-center justify-center mb-8">
              <div className="bg-white px-6 py-2 rounded-lg">
                <h3 className="text-2xl font-bold text-gray-800">
                  {editingId ? "Edit" : ""}
                </h3>
              </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
              <div className="space-y-6">
                <div className="bg-gradient-to-br from-blue-50 to-indigo-50 p-6 rounded-xl border-2 border-blue-100">
                  <h4 className="text-lg font-semibold text-gray-700 mb-4 flex items-center">
                    <span className="bg-blue-100 p-2 rounded-lg mr-3">📝</span>
                    Basic Information
                  </h4>
                  <div className="space-y-4">
                    {[
                      {
                        name: "title",
                        label: "Title",
                        type: "text",
                        icon: "🎯",
                      },
                      {
                        name: "date",
                        label: "Date",
                        type: "date",
                        icon: "📅",
                      },
                      {
                        name: "deadline",
                        label: "Deadline (Date & Time)",
                        type: "datetime-local",
                        icon: "⏳",
                      },

                      {
                        name: "duration",
                        label: "Duration (e.g., 2 hours)",
                        type: "text",
                        icon: "⏰",
                      },
                      {
                        name: "mode",
                        label: "Mode",
                        type: "text",
                        icon: "💻",
                      },
                      {
                        name: "link",
                        label: "Link/URL",
                        type: "url",
                        icon: "🔗",
                      },
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
                          value={formData[name as keyof Test] as string}
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

                <div className="bg-gradient-to-br from-orange-50 to-yellow-50 p-6 rounded-xl border-2 border-orange-100">
                  <div className="flex items-center justify-between mb-4">
                    <h4 className="text-lg font-semibold text-gray-700 flex items-center">
                      <span className="bg-orange-100 p-2 rounded-lg mr-3">
                        🏷️
                      </span>
                      Additional Fields
                    </h4>

                    <button
                      onClick={addExtraField}
                      className="bg-orange-500 hover:bg-orange-600 text-white text-sm px-3 py-1 rounded-lg transition-colors duration-200 cursor-pointer"
                    >
                      + Add Field
                    </button>
                  </div>

                  {formData.extraFields && formData.extraFields.length > 0 ? (
                    <div className="space-y-3">
                      {formData.extraFields.map((field, index) => (
                        <div key={index} className="flex gap-3 items-start">
                          <div className="flex-1">
                            <input
                              type="text"
                              placeholder="Field name (e.g., Syllabus)"
                              value={field.fieldName}
                              onChange={(e) =>
                                updateExtraField(
                                  index,
                                  "fieldName",
                                  e.target.value
                                )
                              }
                              className="w-full p-3 border-2 border-gray-200 rounded-lg focus:border-orange-500 focus:ring-2 focus:ring-orange-100 transition-all duration-200 bg-white text-sm"
                            />
                          </div>
                          <div className="flex-1">
                            <input
                              type="text"
                              placeholder="Field value"
                              value={field.fieldValue}
                              onChange={(e) =>
                                updateExtraField(
                                  index,
                                  "fieldValue",
                                  e.target.value
                                )
                              }
                              className="w-full p-3 border-2 border-gray-200 rounded-lg focus:border-orange-500 focus:ring-2 focus:ring-orange-100 transition-all duration-200 bg-white text-sm"
                            />
                          </div>
                          <button
                            onClick={() => removeExtraField(index)}
                            className="bg-red-500 hover:bg-red-600 text-white px-3 py-3 rounded-lg transition-colors duration-200 cursor-pointer text-sm"
                          >
                            ✕
                          </button>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="text-gray-500 text-sm italic">
                      No additional fields. Click &quot;Add Field&quot; to
                      include custom info like Syllabus, Platform, etc.
                    </p>
                  )}
                </div>
              </div>

              <div className="lg:col-span-1">
                <div className="bg-gradient-to-br from-purple-50 to-pink-50 p-6 rounded-xl border-2 border-purple-100 h-full">
                  <h4 className="text-lg font-semibold text-gray-700 mb-4 flex items-center">
                    <span className="bg-purple-100 p-2 rounded-lg mr-3">
                      📖
                    </span>
                    Description
                  </h4>
                  <div className="mb-5 block bg-gradient-to-br from-green-50 to-teal-50 p-6 rounded-xl border-2 border-green-100 mt-6">
                    <h4 className="text-lg font-semibold text-gray-700 mb-4 flex items-center">
                      <span className="bg-green-100 p-2 rounded-lg mr-3">
                        📄
                      </span>
                      Attach PDF (optional)
                    </h4>
                    <input
                      type="file"
                      accept="application/pdf"
                      onChange={(e) => {
                        const file = e.target.files?.[0];
                        if (file && file.type === "application/pdf") {
                          setPdfFile(file);
                        } else {
                          alert("Only PDF files are allowed.");
                          setPdfFile(null);
                        }
                      }}
                      className="w-full text-sm text-gray-700"
                    />
                    {pdfUrl && (
                      <p className="text-sm mt-2 text-green-600">
                        ✅ Uploaded:{" "}
                        <a
                          href={pdfUrl}
                          target="_blank"
                          className="underline text-blue-600"
                        >
                          View PDF
                        </a>
                      </p>
                    )}
                  </div>
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
                    Add instructions, topics, and important notes.
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
                    ? "bg-green-400 cursor-not-allowed"
                    : "bg-green-500 hover:bg-green-600"
                } text-white font-semibold px-8 py-3 rounded-xl shadow-lg transition-all duration-300 transform hover:scale-105 flex items-center cursor-pointer`}
              >
                {isSubmitting ? "Posting..." : editingId ? "Update" : "Post"}
              </button>
              <button
                onClick={() => {
                  resetFormData();
                  setEditingId(null);
                  setIsAdding(false);
                }}
                disabled={isSubmitting}
                className="bg-gray-400 hover:bg-gray-500 text-white font-semibold px-8 py-3 rounded-xl shadow-lg transition-all duration-300 transform hover:scale-105 flex items-center"
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
              <p className="text-red-700 font-semibold">{error}</p>
            </div>
          </div>
        ) : tests.length === 0 ? (
          <div className="text-center py-12">
            <div className="bg-gray-50 rounded-2xl p-8 max-w-md mx-auto">
              <span className="text-6xl mb-4 block">📝</span>
              <p className="text-xl text-gray-600 font-medium">
                No tests scheduled
              </p>
              <p className="text-gray-500 mt-2">
                Click &quot;Add New Test&quot; to create the first one!
              </p>
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
                  <div className="flex-1">
                    <h3 className="text-xl font-bold text-gray-800 mb-1">
                      {test.title}
                    </h3>
                  </div>
                  <div className="bg-indigo-100 text-indigo-800 px-3 py-1 rounded-full text-sm font-semibold">
                    Test
                  </div>
                </div>

                <div className="space-y-2 mb-6">
                  <div className="flex items-center text-gray-600">
                    <span className="font-medium">Date:</span>
                    <span className="ml-2">
                      {new Date(test.date).toLocaleDateString("en-US", {
                        year: "numeric",
                        month: "short",
                        day: "numeric",
                      })}
                    </span>
                  </div>
                  <div className="flex items-center text-gray-600">
                    <span className="font-medium">Deadline:</span>
                    <span className="ml-2">
                      {new Date(test.deadline).toLocaleString("en-US", {
                        year: "numeric",
                        month: "short",
                        day: "numeric",
                        hour: "2-digit",
                        minute: "2-digit",
                      })}
                    </span>
                  </div>

                  <div className="flex items-center text-gray-600">
                    <span className="font-medium">Duration:</span>
                    <span className="ml-2">{test.duration}</span>
                  </div>
                  <div className="flex items-center text-gray-600">
                    <span className="font-medium">Mode:</span>
                    <span className="ml-2">{test.mode}</span>
                  </div>
                  {test.link && (
                    <div className="flex items-center text-gray-600">
                      <span className="font-medium">Link:</span>
                      <a
                        href={test.link}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="ml-2 text-indigo-600 hover:text-indigo-800 underline text-sm truncate"
                      >
                        Go to Test
                      </a>
                    </div>
                  )}

                  {test.extraFields && test.extraFields.length > 0 && (
                    <div className="mt-3 pt-3 border-t border-gray-100">
                      <div className="text-sm font-medium text-gray-700 mb-2">
                        Additional Information:
                      </div>
                      <div className="space-y-1">
                        {test.extraFields.map((field, index) => (
                          <div
                            key={index}
                            className="flex items-center text-gray-600 text-sm"
                          >
                            <span className="font-medium">
                              {field.fieldName.startsWith("Test PDF") ? "Related Document" : field.fieldName}:
                            </span>
                            <span className="ml-2 wrap">{field.fieldValue.startsWith("https://res.cloudinary.com") ? <a target="_blank" href={field.fieldValue}><span className="underline text-indigo-600">View PDF</span></a> : field.fieldValue}</span>
                          </div>
                        ))}
                      </div>
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
                      dangerouslySetInnerHTML={{ __html: test.description }}
                    />
                  </div>
                </div>

                <div className="flex gap-3 pt-4 border-t border-gray-200">
                  <button
                    onClick={() => {
                      setFormData({
                        ...test,
                        extraFields: test.extraFields || [],
                      });
                      setPdfUrl(test.pdfUrl || "");
                      setPdfFile(null);
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
                      <span className="mr-2">⚠️</span>
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
