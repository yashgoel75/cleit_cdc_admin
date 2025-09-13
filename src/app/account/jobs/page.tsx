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
import { set } from "mongoose";
import { getFirebaseToken } from "@/utils";

const QuillEditor = dynamic(() => import("@/components/TestEditor"), {
  ssr: false,
});

export default function Jobs() {
  interface Job {
    _id?: string;
    company: string;
    type: string;
    role: string;
    location: string;
    description: string;
    deadline: string;
    pdfUrl: string;
    linkToApply: string;
    studentsApplied?: string[];
    extraFields?: { fieldName: string; fieldValue: string }[];
    inputFields?: {
      fieldName: string;
      type: string;
      placeholder?: string;
      required?: boolean;
      options?: string[];
    }[];
  }

  const [pdfFile, setPdfFile] = useState<File | null>(null);
  const [pdfUrl, setPdfUrl] = useState<string>("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [jobs, setJobs] = useState<Job[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [formData, setFormData] = useState<Job>({
    company: "",
    role: "",
    type: "Open Opportunity",
    location: "",
    description: "",
    deadline: "",
    linkToApply: "",
    pdfUrl: "",
    extraFields: [],
    inputFields: [],
  });
  const [editingId, setEditingId] = useState<string | null>(null);
  const [isAdding, setIsAdding] = useState(false);
  const [jobIdToDelete, setJobIdToDelete] = useState<string | null>(null);
  const router = useRouter();

  const fetchJobs = async (email: string | null | undefined) => {
    try {
      const token = await getFirebaseToken();
      const res = await fetch(
        `/api/jobs?email=${encodeURIComponent(email || "")}`,
        {
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
        }
      );
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to fetch jobs");
      setJobs(data.jobs);
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
        fetchJobs(user.email);
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
      company: "",
      role: "",
      type: "Open Opportunity",
      location: "",
      description: "",
      deadline: "",
      linkToApply: "",
      pdfUrl: "",
      extraFields: [],
      inputFields: [],
    });
    setPdfUrl("");
    setPdfFile(null);
  };

  const uploadPdfToCloudinary = async (): Promise<string> => {
    if (!pdfFile || !currentUser) return "";

    const PdfformData = new FormData();
    const publicId = `job_pdf_${Date.now()}`;
    const folder = "job_pdfs";
    const token = await getFirebaseToken();
    const signatureRes = await fetch("/api/signtest", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
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
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
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
          (field) => field.fieldName !== "Job PDF"
        ) || [];

      if (finalPdfUrl) {
        dataToSend.extraFields = [
          ...otherExtraFields,
          { fieldName: "Job PDF", fieldValue: finalPdfUrl },
        ];
      } else {
        dataToSend.extraFields = otherExtraFields;
      }

      const body = editingId
        ? {
            jobId: editingId,
            updates: dataToSend,
            adminEmail: currentUser.email,
          }
        : { newJob: dataToSend, adminEmail: currentUser.email };

      const method = editingId ? "PATCH" : "POST";
      const token = await getFirebaseToken();
      const res = await fetch("/api/jobs", {
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
        fetchJobs(currentUser.email);
      }
    } catch (error) {
      console.error("Failed to submit the job:", error);
      setError("Failed to submit the job. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!currentUser) return;
    const token = await getFirebaseToken();
    const res = await fetch("/api/jobs", {
      method: "DELETE",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({ jobId: id, adminEmail: currentUser.email }),
    });
    if (res.ok) fetchJobs(currentUser.email);
  };

  const addInputField = () => {
    setFormData({
      ...formData,
      inputFields: [
        ...(formData.inputFields || []),
        { fieldName: "", type: "text", placeholder: "", required: false },
      ],
    });
  };

  const removeInputField = (index: number) => {
    const newFields = [...(formData.inputFields || [])];
    newFields.splice(index, 1);
    setFormData({ ...formData, inputFields: newFields });
  };

  const updateInputField = <K extends keyof NonNullable<Job["inputFields"]>[0]>(
    index: number,
    field: K,
    value: NonNullable<Job["inputFields"]>[0][K]
  ) => {
    const newFields = [...(formData.inputFields || [])];
    newFields[index] = { ...newFields[index], [field]: value };
    setFormData({ ...formData, inputFields: newFields });
  };

  const [isCopied, setIsCopied] = useState(false);
  const copyJobLink = async (jobId: string) => {
    const jobUrl = `https://cdc.cleit.in/account/jobs/${jobId}`;

    try {
      await navigator.clipboard.writeText(jobUrl);
      setIsCopied(true);
      setTimeout(() => {
        setIsCopied(false);
      }, 1500);
    } catch (err) {
      console.error("Failed to copy: ", err);
      const textArea = document.createElement("textarea");
      textArea.value = jobUrl;
      document.body.appendChild(textArea);
      textArea.focus();
      textArea.select();
      try {
        document.execCommand("copy");
        alert("Job link copied to clipboard!");
      } catch (fallbackErr) {
        console.error("Fallback copy failed: ", fallbackErr);
        alert("Failed to copy link. Please copy manually: " + jobUrl);
      }
      document.body.removeChild(textArea);
    }
  };

  const [showList, setShowList] = useState(false);
  return (
    <>
      <Header />
      <main className="w-[95%] min-h-[85vh] lg:w-full max-w-7xl mx-auto py-10 md:py-16 px-4">
        <h2 className="text-4xl md:text-4xl font-extrabold text-center text-gray-900 mb-12">
          Manage Job Opportunities
        </h2>

        <div className="flex justify-center mb-8">
          <button
            onClick={() => {
              resetFormData();
              setEditingId(null);
              setJobIdToDelete(null);
              setIsAdding(true);
            }}
            className="bg-emerald-500 hover:bg-emerald-700 text-white font-semibold px-8 py-3 rounded-lg shadow-lg transition-all duration-300 transform hover:scale-105 cursor-pointer"
          >
            + Add New Job
          </button>
        </div>

        {(isAdding || editingId) && (
          <div className="mb-12 bg-white p-8 rounded-2xl shadow-xl border border-gray-100 max-w-6xl mx-auto">
            <div className="flex items-center justify-center mb-8">
              <div className="bg-white px-6 py-2 rounded-lg">
                <h3 className="text-2xl font-bold text-gray-800">
                  {editingId ? "Edit Job Position" : "Post New Job"}
                </h3>
              </div>
            </div>

            <div className="mb-6">
              <label
                htmlFor="type"
                className="block text-sm font-semibold text-gray-700 mb-2 flex items-center"
              >
                <span className="mr-2">🎯</span>
                Job Type
              </label>
              <select
                id="type"
                value={formData.type}
                onChange={(e) =>
                  setFormData({
                    ...formData,
                    type: e.target.value,
                  })
                }
                className="w-full p-4 border-2 border-gray-200 rounded-xl focus:border-emerald-500 focus:ring-4 focus:ring-emerald-100 transition-all duration-300 bg-white shadow-sm hover:shadow-md focus:outline-none"
              >
                <option value="Open Opportunity">Open Opportunity</option>
                <option value="Campus Drive">Campus Drive</option>
              </select>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
              <div className="space-y-6">
                <div className="bg-gradient-to-br from-emerald-50 to-teal-50 p-6 rounded-xl border-2 border-emerald-100">
                  <h4 className="text-lg font-semibold text-gray-700 mb-4 flex items-center">
                    <span className="bg-emerald-100 p-2 rounded-lg mr-3">
                      🏢
                    </span>
                    Company & Position Details
                  </h4>

                  <div className="space-y-4">
                    {[
                      {
                        name: "company",
                        label: "Company Name",
                        type: "text",
                        icon: "🏢",
                      },
                      {
                        name: "role",
                        label: "Job Title / Role",
                        type: "text",
                        icon: "💼",
                      },
                      {
                        name: "location",
                        label: "Job Location",
                        type: "text",
                        icon: "📍",
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
                          value={formData[name as keyof Job] as string}
                          onChange={(e) =>
                            setFormData({ ...formData, [name]: e.target.value })
                          }
                          placeholder={`Enter ${label.toLowerCase()}`}
                          className="w-full p-4 border-2 border-gray-200 rounded-xl focus:border-emerald-500 focus:ring-4 focus:ring-emerald-100 transition-all duration-300 bg-white shadow-sm hover:shadow-md"
                        />
                      </div>
                    ))}
                  </div>
                </div>

                <div className="bg-gradient-to-br from-blue-50 to-indigo-50 p-6 rounded-xl border-2 border-blue-100">
                  <h4 className="text-lg font-semibold text-gray-700 mb-4 flex items-center">
                    <span className="bg-blue-100 p-2 rounded-lg mr-3">📋</span>
                    Application Details
                  </h4>
                  <div className="space-y-4">
                    <div className="group">
                      <label
                        htmlFor="deadline"
                        className="block text-sm font-semibold text-gray-700 mb-2 flex items-center"
                      >
                        <span className="mr-2">⏰</span>
                        Application Deadline (Date & Time)
                      </label>
                      <input
                        id="deadline"
                        type="datetime-local"
                        value={formData.deadline}
                        onChange={(e) =>
                          setFormData({ ...formData, deadline: e.target.value })
                        }
                        className="w-full p-4 border-2 border-gray-200 rounded-xl focus:border-blue-500 focus:ring-4 focus:ring-blue-100 transition-all duration-300 bg-white shadow-sm hover:shadow-md"
                      />
                    </div>

                    <div className="group">
                      <label
                        htmlFor="linkToApply"
                        className="block text-sm font-semibold text-gray-700 mb-2 flex items-center"
                      >
                        <span className="mr-2">🔗</span>
                        Application Link
                      </label>
                      <input
                        id="linkToApply"
                        type="url"
                        value={formData.linkToApply}
                        onChange={(e) =>
                          setFormData({
                            ...formData,
                            linkToApply: e.target.value,
                          })
                        }
                        placeholder="https://company.com/apply"
                        className="w-full p-4 border-2 border-gray-200 rounded-xl focus:border-blue-500 focus:ring-4 focus:ring-blue-100 transition-all duration-300 bg-white shadow-sm hover:shadow-md"
                      />
                    </div>
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
                              placeholder="Field name (e.g., Salary, Experience)"
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
                      No additional fields added. Click &quot;Add Field&quot; to
                      include custom information like salary, experience level,
                      benefits, etc.
                    </p>
                  )}
                </div>

                <div className="bg-gradient-to-br from-pink-50 to-red-50 p-6 rounded-xl border-2 border-pink-100">
                  <div className="flex items-center justify-between mb-4">
                    <h4 className="text-lg font-semibold text-gray-700 flex items-center">
                      <span className="bg-pink-100 p-2 rounded-lg mr-3">
                        📝
                      </span>
                      Application Form Fields
                    </h4>
                    <button
                      onClick={addInputField}
                      className="bg-pink-500 hover:bg-pink-600 text-white text-sm px-3 py-1 rounded-lg transition-colors duration-200 cursor-pointer"
                    >
                      + Add Input Field
                    </button>
                  </div>

                  {formData.inputFields && formData.inputFields.length > 0 ? (
                    <div className="space-y-3">
                      {formData.inputFields.map((field, index) => (
                        <div
                          key={index}
                          className="p-4 border border-gray-300 rounded-lg bg-white space-y-3"
                        >
                          <div className="grid grid-cols-2 gap-3">
                            <input
                              type="text"
                              placeholder="Field name (e.g., GitHub Profile)"
                              value={field.fieldName}
                              onChange={(e) =>
                                updateInputField(
                                  index,
                                  "fieldName",
                                  e.target.value
                                )
                              }
                              className="p-2 border border-gray-200 rounded"
                            />
                            <select
                              value={field.type}
                              onChange={(e) =>
                                updateInputField(index, "type", e.target.value)
                              }
                              className="p-2 border border-gray-200 rounded"
                            >
                              <option value="text">Text</option>
                              <option value="number">Number</option>
                              <option value="select">Select</option>
                              <option value="file">File Upload</option>
                            </select>
                          </div>

                          <input
                            type="text"
                            placeholder="Placeholder"
                            value={field.placeholder}
                            onChange={(e) =>
                              updateInputField(
                                index,
                                "placeholder",
                                e.target.value
                              )
                            }
                            className="w-full p-2 border border-gray-200 rounded"
                          />

                          <div className="flex items-center gap-3">
                            <label className="flex items-center gap-3 text-sm">
                              <span className="text-gray-700">Required</span>
                              <div className="relative inline-block w-10 mr-2 align-middle select-none transition duration-200 cursor-pointer ease-in">
                                <input
                                  type="checkbox"
                                  checked={field.required}
                                  onChange={(e) =>
                                    updateInputField(
                                      index,
                                      "required",
                                      e.target.checked
                                    )
                                  }
                                  className="peer sr-only"
                                />
                                <div className="block bg-gray-300 peer-checked:bg-emerald-500 w-10 h-6 transition duration-300 rounded-full"></div>
                                <div className="dot absolute left-1 top-1 bg-white w-4 h-4 rounded-full transition transform duration-300 peer-checked:translate-x-4"></div>
                              </div>
                            </label>
                          </div>

                          {field.type === "select" && (
                            <textarea
                              placeholder="Options (comma separated)"
                              value={field.options?.join(",") || ""}
                              onChange={(e) =>
                                updateInputField(
                                  index,
                                  "options",
                                  e.target.value.split(",")
                                )
                              }
                              className="w-full p-2 border rounded text-sm"
                            />
                          )}

                          <button
                            onClick={() => removeInputField(index)}
                            className="bg-red-500 hover:bg-red-600 text-white px-3 py-1 rounded-lg text-sm cursor-pointer"
                          >
                            Remove Field
                          </button>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="text-gray-500 text-sm italic">
                      No input fields defined. Click &quot;Add Input Field&quot;
                      to let students provide custom information like resume
                      links, portfolio, preferences, etc.
                    </p>
                  )}
                </div>
              </div>

              <div className="lg:col-span-1">
                <div className="bg-gradient-to-br from-purple-50 to-pink-50 p-6 rounded-xl border-2 border-purple-100 h-full">
                  <h4 className="text-lg font-semibold text-gray-700 mb-4 flex items-center">
                    <span className="bg-purple-100 p-2 rounded-lg mr-3">
                      📄
                    </span>
                    Job Description
                  </h4>

                  <div className="mb-5 bg-gradient-to-br from-green-50 to-teal-50 p-6 rounded-xl border-2 border-green-100">
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
                    Include job responsibilities, requirements, qualifications,
                    benefits, and company culture
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
                {isSubmitting
                  ? "Posting..."
                  : editingId
                  ? "Update Job"
                  : "Post Job"}
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
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-emerald-600 mx-auto mb-4"></div>
            <p className="text-lg text-gray-600">
              Loading job opportunities...
            </p>
          </div>
        ) : error ? (
          <div className="text-center py-8">
            <div className="bg-red-50 border border-red-200 rounded-xl p-6 max-w-md mx-auto">
              <p className="text-red-700 font-semibold">{error}</p>
            </div>
          </div>
        ) : jobs.length === 0 ? (
          <div className="text-center py-12">
            <div className="bg-gray-50 rounded-2xl p-8 max-w-md mx-auto">
              <span className="text-6xl mb-4 block">💼</span>
              <p className="text-xl text-gray-600 font-medium">
                No job opportunities found
              </p>
              <p className="text-gray-500 mt-2">
                Click &quot;Add New Job&quot; to post your first opportunity!
              </p>
            </div>
          </div>
        ) : (
          <section className="grid gap-8 sm:grid-cols-2 lg:grid-cols-3">
            {jobs.map((job) => (
              <div
                key={job._id}
                className="bg-white border-2 border-gray-100 rounded-2xl shadow-lg p-6 hover:shadow-2xl hover:border-emerald-200 transition-all duration-300 transform hover:-translate-y-1"
              >
                <div className="flex items-start justify-between mb-4">
                  <div className="flex-1">
                    <h3 className="text-xl font-bold text-gray-800 mb-1">
                      {job.company}
                    </h3>
                    <p className="text-emerald-600 font-semibold text-lg">
                      {job.role}
                    </p>
                  </div>
                  <div className="bg-emerald-100 text-emerald-800 px-3 py-1 rounded-full text-sm font-semibold">
                    Job
                  </div>
                </div>
                <div className="space-y-2 mb-6">
                  <div className="flex items-center text-gray-600">
                    <span className="font-medium">Location:</span>
                    <span className="ml-2">{job.location}</span>
                  </div>
                  <div className="flex items-center text-gray-600">
                    <span className="font-medium">Deadline:</span>
                    <span className="ml-2">
                      {job.deadline
                        ? new Date(job.deadline).toLocaleDateString("en-US", {
                            year: "numeric",
                            month: "short",
                            day: "numeric",
                          })
                        : "No deadline specified"}
                    </span>
                  </div>
                  {job.linkToApply && (
                    <div className="flex items-center text-gray-600">
                      <span className="font-medium">Apply:</span>
                      <a
                        href={job.linkToApply}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="ml-2 text-emerald-600 hover:text-emerald-800 underline text-sm truncate"
                      >
                        Application Link
                      </a>
                    </div>
                  )}

                  {job.extraFields && job.extraFields.length > 0 && (
                    <div className="mt-3 pt-3 border-t border-gray-100">
                      <div className="text-sm font-medium text-gray-700 mb-2">
                        Additional Information:
                      </div>
                      <div className="space-y-1">
                        {job.extraFields.map((field, index) => (
                          <div
                            key={index}
                            className="flex items-center text-gray-600 text-sm"
                          >
                            <span className="font-medium">
                              {field.fieldName}:
                            </span>
                            <span className="ml-2">
                              {field.fieldValue.startsWith(
                                "https://res.cloudinary.com/"
                              ) ? (
                                <a href={field.fieldValue} target="_blank">
                                  View PDF
                                </a>
                              ) : (
                                field.fieldValue
                              )}
                            </span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {job.inputFields && job.inputFields.length > 0 && (
                    <div className="mt-3 pt-3 border-t border-gray-100">
                      <div className="text-sm font-medium text-gray-700 mb-2">
                        Application Form Fields:
                      </div>
                      <ul className="list-disc pl-5 text-gray-600 text-sm">
                        {job.inputFields.map((field, idx) => (
                          <li key={idx}>
                            {field.fieldName} ({field.type}
                            {field.required ? ", required" : ""})
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}
                </div>
                <div className="mb-4">
                  <div className="flex items-center mb-2">
                    <span className="font-semibold text-gray-700">
                      Job Description:
                    </span>
                  </div>
                  <div className="bg-gray-50 p-3 rounded-lg max-h-32 overflow-y-auto">
                    <div
                      className="text-sm text-gray-700 leading-relaxed"
                      dangerouslySetInnerHTML={{ __html: job.description }}
                    />
                  </div>
                </div>
                <div className="flex gap-3 pt-4 border-t border-gray-200">
                  <button
                    onClick={() => {
                      setFormData({
                        ...job,
                        extraFields: job.extraFields || [],
                      });
                      setEditingId(job._id!);
                      setIsAdding(false);
                    }}
                    className="flex-1 bg-blue-50 text-blue-700 hover:bg-blue-100 font-medium py-2 px-4 rounded-lg transition-colors duration-200 flex items-center justify-center cursor-pointer"
                  >
                    Edit
                  </button>
                  <button
                    onClick={() => setJobIdToDelete(job._id!)}
                    className="flex-1 bg-red-50 text-red-700 hover:bg-red-100 font-medium py-2 px-4 rounded-lg transition-colors duration-200 flex items-center justify-center cursor-pointer"
                  >
                    Delete
                  </button>
                </div>
                {job.studentsApplied && job.studentsApplied.length > 0 && (
                  <div className="mt-4 text-center">
                    <div className="bg-orange-100 px-4 py-1 rounded-full text-orange-800 text-xs font-medium inline-flex items-center">
                      {job.studentsApplied.length} student
                      {job.studentsApplied.length !== 1 ? "s" : ""} applied
                    </div>
                  </div>
                )}
                <div className="flex gap-3 pt-2">
                  <div className="bg-green-100 flex-1 text-green-800 hover:bg-green-200 font-medium py-2 px-4 rounded-lg transition-colors duration-200 flex items-center justify-center cursor-pointer">
                    <button
                      onClick={() => copyJobLink(job._id!)}
                      className="cursor-pointer"
                    >
                      {isCopied ? "Copied" : "Copy Job Link"}
                    </button>
                  </div>
                </div>
                <div className="text-center flex justify-center pt-4">
                  <div className="bg-blue-100 px-4 py-1 rounded-full text-blue-800 text-xs font-medium inline-flex items-center">
                    <Link
                      href={`/account/jobs/${job._id}`}
                      onClick={() => setShowList(true)}
                    >
                      {showList ? "Loading..." : "View Students Applied"}
                    </Link>
                  </div>
                </div>
                {jobIdToDelete === job._id && (
                  <div className="mt-4 p-4 bg-red-50 border border-red-200 rounded-lg">
                    <p className="text-red-800 font-medium mb-3 flex items-center">
                      <span className="mr-2">⚠️</span>
                      Are you sure you want to delete this job posting?
                    </p>
                    <div className="flex gap-3">
                      <button
                        onClick={() => handleDelete(job._id!)}
                        className="bg-red-600 hover:bg-red-700 text-white px-4 py-2 rounded-md font-medium transition-colors duration-200 cursor-pointer"
                      >
                        Yes, Delete
                      </button>
                      <button
                        onClick={() => setJobIdToDelete(null)}
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
