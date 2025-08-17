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

export default function Jobs() {
  interface Job {
    _id?: string;
    company: string;
    role: string;
    location: string;
    description: string;
    deadline: string; // stored as string in form, converted before sending
    linkToApply: string;
  }

  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [jobs, setJobs] = useState<Job[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [formData, setFormData] = useState<Job>({
    company: "",
    role: "",
    location: "",
    description: "",
    deadline: "",
    linkToApply: "",
  });
  const [editingId, setEditingId] = useState<string | null>(null);
  const [isAdding, setIsAdding] = useState(false);
  const [jobIdToDelete, setJobIdToDelete] = useState<string | null>(null);
  const router = useRouter();

  const fetchJobs = async (email: string | null | undefined) => {
    try {
      const res = await fetch(
        `/api/jobs?email=${encodeURIComponent(email || "")}`
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
  }, []);

  const handleSubmit = async () => {
    if (!currentUser) return;
    const jobData = {
      ...formData,
      deadline: formData.deadline ? new Date(formData.deadline) : null,
    };
    const body = editingId
      ? { jobId: editingId, updates: jobData }
      : { newJob: jobData };
    const method = editingId ? "PATCH" : "POST";
    const res = await fetch("/api/jobs", {
      method,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    if (res.ok) {
      setFormData({
        company: "",
        role: "",
        location: "",
        description: "",
        deadline: "",
        linkToApply: "",
      });
      setEditingId(null);
      setIsAdding(false);
      fetchJobs(currentUser.email);
    }
  };

  const handleDelete = async (id: string) => {
    if (!currentUser) return;
    const res = await fetch("/api/jobs", {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ jobId: id }),
    });
    if (res.ok) fetchJobs(currentUser.email);
  };

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
              setFormData({
                company: "",
                role: "",
                location: "",
                description: "",
                deadline: "",
                linkToApply: "",
              });
              setEditingId(null);
              setJobIdToDelete(null);
              setIsAdding(true);
            }}
            className="bg-indigo-500 hover:bg-indigol-700 text-white font-semibold px-8 py-3 rounded-lg shadow-lg transition-all duration-300 transform hover:scale-105 cursor-pointer"
          >
            + Add New Job
          </button>
        </div>

        {(isAdding || editingId) && (
          <div className="mb-12 bg-white p-8 rounded-2xl shadow-xl border border-gray-100 max-w-5xl mx-auto">
            <div className="flex items-center justify-center mb-8">
              <div className="bg-white px-6 py-2 rounded-lg">
                <h3 className="text-2xl font-bold text-gray-800">
                  {editingId ? "Edit Job Position" : "Post New Job"}
                </h3>
              </div>
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
                          value={formData[name as keyof Job]}
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
                        Application Deadline
                      </label>
                      <input
                        id="deadline"
                        type="date"
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
              </div>

              {/* Right Column - Job Description */}
              <div className="lg:col-span-1">
                <div className="bg-gradient-to-br from-purple-50 to-pink-50 p-6 rounded-xl border-2 border-purple-100 h-full">
                  <h4 className="text-lg font-semibold text-gray-700 mb-4 flex items-center">
                    <span className="bg-purple-100 p-2 rounded-lg mr-3">
                      📄
                    </span>
                    Job Description
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
                    Include job responsibilities, requirements, qualifications,
                    benefits, and company culture
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
                {editingId ? "Update Job" : "Post Job"}
              </button>
              <button
                onClick={() => {
                  setFormData({
                    company: "",
                    role: "",
                    location: "",
                    description: "",
                    deadline: "",
                    linkToApply: "",
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
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-emerald-600 mx-auto mb-4"></div>
            <p className="text-lg text-gray-600">
              Loading job opportunities...
            </p>
          </div>
        ) : error ? (
          <div className="text-center py-8">
            <div className="bg-red-50 border border-red-200 rounded-xl p-6 max-w-md mx-auto">
              <span className="text-4xl mb-2 block">❌</span>
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
                    💼 Job
                  </div>
                </div>

                <div className="space-y-2 mb-6">
                  <div className="flex items-center text-gray-600">
                    <span className="mr-2">📍</span>
                    <span className="font-medium">Location:</span>
                    <span className="ml-2">{job.location}</span>
                  </div>
                  <div className="flex items-center text-gray-600">
                    <span className="mr-2">⏰</span>
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
                      <span className="mr-2">🔗</span>
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
                      setFormData(job);
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
